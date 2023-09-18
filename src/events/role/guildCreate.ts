import { create_user_when_not_exist, update_guild } from "@utils/prisma";
import { create_role } from "@utils/role";
import { client, prisma } from "src";

client.on('guildCreate', async guild => {
    await prisma.role.deleteMany({ where: { id: { startsWith: `${guild.id}/` }}});
    await update_guild(guild.id, 'join');

    const members = await guild.members.list({ limit: guild.memberCount });
    for (const [memberId, member] of members) {
        await create_user_when_not_exist(memberId);

        const data = await prisma.guild.findUnique({
            where: { id: guild.id }
        })
        if (data?.state != 'join') break;
        
        await create_role(member);
    }
})