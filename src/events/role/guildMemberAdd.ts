import { create_user_when_not_exist } from "@utils/prisma";
import { create_role } from "@utils/role";
import { client } from "src";

client.on('guildMemberAdd', async member => {
    await create_user_when_not_exist(member.id);
    
    await create_role(member);
})