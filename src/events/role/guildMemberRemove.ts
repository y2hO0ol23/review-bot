import { create_user_when_not_exist } from "@utils/prisma";
import { remove_role } from "@utils/role";
import { client } from "src";

client.on('guildMemberRemove', async member => {
    if (member.id == client.user?.id) return;
    await remove_role(member);
})