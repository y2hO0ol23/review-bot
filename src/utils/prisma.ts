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

export function url_to_prisma_data(url: string) {
    return url.slice(29);
}

export function get_average(data: any) {
    let average: number = 0.0;

    if (data.length) {
        average = data.reduce((acc: any, data: any) => {
            return acc + data.score;
        }, 0.0) / data.length;
    }

    return average;
}

export async function update_guild(guildId: string, state: string) {
    await prisma.guild.findUnique({
        where: { id: guildId }
    })
    .then(async data => {
        if (data) {
            await prisma.guild.update({
                where: { id: guildId },
                data: { state: state }
            });
        }
        else {
            await prisma.guild.create({
                data: {
                    id: guildId,
                    state: state
                }
            });
        }
    });
}
