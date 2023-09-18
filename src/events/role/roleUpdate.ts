import { edit_role } from "@utils/role";
import { client, prisma } from "src";

client.on('roleUpdate', async (_, role) => {
    if (role.tags?.botId == client.user?.id) {
        const guild = role.guild;

        await prisma.role.findMany({
            where: { guildId: guild.id }
        })
        .then(async data => {
            var now = role.position - 1;
            for (var e of data) {
                const check = await guild.roles.fetch(role.id);
                if (check?.position != role.position) break;

                await edit_role(e.userId, e.guildId, e.id, {
                    position: now
                });
            }
        })
        .catch(()=>{});
    }
})