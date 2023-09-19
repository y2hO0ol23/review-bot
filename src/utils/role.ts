import { GuildMember, PartialGuildMember, Role } from "discord.js";
import {prisma } from "src";
import { get_average } from "./prisma";

export async function give_role(member: GuildMember|PartialGuildMember) {
    const guild = member.guild;

    await prisma.review.findMany({
        where: { subjectId: member.id }
    })
    .then(async data => {
        const average = get_average(data);
        const rolename = `⭐${average.toFixed(1)}`

        await prisma.role.findMany({
            where: { 
                id: { startsWith: `${member.guild.id}/` },
                display: rolename
            }
        })
        .then(async data => {
            if (data.length) {
                const role = await guild.roles.fetch(data[0].id.split('/')[1]);
                if (role) {
                    try {
                        await member.roles.add(role);

                        return await prisma.role.update({
                            where: { id: `${data[0].id}` },
                            data: {
                                user: {
                                    connect: { id: member.id }
                                }
                            }
                        });
                    }
                    catch {
                        await prisma.user.findMany({
                            where: {
                                roles: {
                                    some: { id: `${data[0].id}` }
                                }
                            }
                        })
                        .then(async users => {
                            await prisma.role.delete({
                                where: { id: `${data[0].id}` }
                            });
                            for (var user of users) {
                                const member = await guild.members.fetch(user.id);
                                await give_role(member);
                            }
                        })
                    }
                }
                else {
                    await prisma.role.delete({
                        where: { id: `${guild.id}/${data[0].id}` }
                    });
                }
            }
            
            await guild.roles.create({
                name: rolename
            })
            .then(async role => {
                await member.roles.add(role);
                
                await prisma.role.create({
                    data: {
                        id: `${guild.id}/${role.id}`,
                        display: rolename,
                        user: {
                            connect: { id: member.id }
                        }
                    }
                });
            });
        })
    })
}

export async function remove_role(member: GuildMember|PartialGuildMember) {
    await prisma.user.findUnique({
        where: { id: member.id },
        include: { 
            roles: {
                include: { user : true }
            } 
        }
    })
    .then(async data => {
        if (data) {
            const roleData = data.roles.find(e => e.id.startsWith(`${member.guild.id}/`));
            if (roleData) {
                const userLeft = roleData.user.length;
                if (userLeft - 1 != 0) {
                    await prisma.user.update({
                        where: { id: member.id },
                        data: {
                            roles: {
                                disconnect: { id: roleData?.id }
                            }
                        }
                    });
    
                    await member.guild.roles.fetch(roleData.id.split('/')[1])
                    .then(async role => await member.roles.remove(role as Role))
                    .catch(()=>{});
                }
                else {
                    await prisma.role.delete({
                        where: { id: roleData.id }
                    });
    
                    await member.guild.roles.fetch(roleData.id.split('/')[1])
                    .then(async role => role?.delete())
                    .catch(()=>{});
                }
            }
        }
    });
    
    await give_role(member);
}