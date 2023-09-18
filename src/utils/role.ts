import { Guild, GuildMember, PartialGuildMember, RoleResolvable } from "discord.js";
import { client, prisma } from "src";
import { count_ui } from "./ui";
import { get_average } from "./prisma";

export async function create_role(member: GuildMember|PartialGuildMember) {
    const guild = member.guild;

    await prisma.review.findMany({
        where: { subjectId: member.id }
    })
    .then(async data => {
        const average = get_average(data);

        const rolepos = guild.roles.cache.find(r => r.tags?.botId == client.user?.id)?.position as number;
        await guild.roles.create({
            name: `⭐${average.toFixed(1)} (${count_ui(data.length)})`,
            position: rolepos - 1
        })
        .then(async role => {
            await member.roles.add(role);
            
            await prisma.role.create({
                data: {
                    id: role.id,
                    guildId: guild.id,
                    user: {
                        connect: { id: member.id }
                    }
                }
            });
        })
    })
}

export async function delete_role(memberId: string, guildId: string) {
    await prisma.role.findMany({
        where: { userId: memberId, guildId: guildId },
    })
    .then(async data => {
        if (data.length) {
            const guild = await client.guilds.fetch(guildId);

            await guild.roles.fetch(data[0].id)
            .then(async role => await role?.delete())
            .catch(()=>{});

            await prisma.role.delete({
                where: { id: data[0].id }
            });
        }
    });
}

export async function edit_role(memberId: string, guildId: string, roleId: string, value: any) {
    const guild = await client.guilds.fetch(guildId);

    await guild.roles.fetch(roleId)
    .then(async data => {
        await guild.roles.edit(data as RoleResolvable, value)
        .catch(async () => {
            await delete_role(memberId, guildId);
            
            await guild.members.fetch(memberId)
            .then(async member => await create_role(member))
            .catch(()=>{});
        });
    })
}