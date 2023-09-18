import { create_user_when_not_exist } from "@utils/prisma";
import { delete_role } from "@utils/role";
import { client } from "src";

client.on('guildMemberRemove', async member => {
    await create_user_when_not_exist(member.id);
    
    await delete_role(member.id, member.guild.id);
})