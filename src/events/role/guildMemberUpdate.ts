import { create_role, delete_role } from "@utils/role";
import { client, prisma } from "src";

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const guild = newMember.guild;

    const old_roles = oldMember.roles.cache;
    const new_roles = newMember.roles.cache;

    if (old_roles.map(e => e.id) != new_roles.map(e => e.id)) {
        const roles_removed = old_roles.filter(e => !new_roles.has(e.id));
        const roles_added = new_roles.filter(e => !old_roles.has(e.id));

        for (const [roleId, role] of roles_removed) {
            await prisma.role.findUnique({
                where: { id: `${guild.id}/${roleId}` },
                include: { user: true }
            })
            .then(async data => {
                if (data && data.userId == newMember.id) {
                    await newMember.roles.add(role)
                    .catch(async () => {
                        await delete_role(newMember.id, guild.id);
                        await create_role(newMember);
                    });
                }
            })
        }
        
        for (const [roleId, role] of roles_added) {
            await prisma.role.findUnique({
                where: { id: `${guild.id}/${roleId}` },
                include: { user: true }
            })
            .then(async data => {
                if (data && data.userId != newMember.id) {
                    await newMember.roles.remove(role)
                    .catch(async () => {
                        await delete_role(newMember.id, guild.id);
                        await create_role(newMember);
                    })
                }
            })
        }
    }
})