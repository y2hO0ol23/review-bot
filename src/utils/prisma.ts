import { prisma } from "..";

export async function create_user_when_not_exist(id: string) {
    await prisma.user.findUnique({
        where: { id: id }
    })
    .then(async data => {
        if (data) return;       
        await prisma.user.create({
            data: { id: id }
        })
    })
    .catch(err => console.log(err));
}