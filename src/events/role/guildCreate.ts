import { create_user_when_not_exist } from "@utils/prisma";
import { create_role } from "@utils/role";
import { client, prisma } from "src";

client.on('guildCreate', async guild => {
    await prisma.role.deleteMany({ where: { guildId: guild.id } });

    const members = await guild.members.list({ limit: guild.memberCount });
    for (const [memberId, member] of members) {
        await create_user_when_not_exist(memberId);

        await create_role(member);
    }
})