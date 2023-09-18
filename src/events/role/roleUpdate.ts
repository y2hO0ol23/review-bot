import { delete_role, edit_role } from "@utils/role";
import { RoleResolvable } from "discord.js";
import { client, prisma } from "src";

client.on('roleUpdate', async (_, role) => {
    if (role.tags?.botId == client.user?.id) {
        const guild = role.guild;

        await prisma.role.findMany({
            where: { guildId: guild.id }
        })
        .then(async data => {
            for (var e of data) {
                edit_role(e.userId, e.guildId, e.id, {
                    position: role.position - 1
                });
            }
        })
        .catch(()=>{});
    }
})