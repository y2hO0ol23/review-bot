import { EmbedBuilder } from "discord.js";
import { client, prisma } from "..";

export function score_ui(score: number): string {
    return '★'.repeat(Math.floor(score)) + '☆'.repeat(5 - Math.floor(score));
}

export function count_ui(count: number): string {
    if (count > 100) return `150+`;
    if (count > 50)  return `50+`;
    return `${count}`;
}


export async function review_ui(id?: number) {
    const embed = new EmbedBuilder()
    .setColor(0x111111)
    .setDescription(`**No longer exists**`);

    if (!id) return embed;

    await prisma.review.findUnique({
        where: { id: id }
    })
    .then(async data => {
        if (data) {
            embed.setDescription(`<@${data.authorId}> → <@${data.subjectId}>`)
            .addFields([
                {
                    name: `📝 ${data.title} [${score_ui(data.score)}]`,
                    value: `\`\`\`${data.content}\`\`\``,
                }
            ])
            .setFooter({ text: `👍 ${data.like}` })

            const subject = await client.users.fetch(data.subjectId);
            if (subject) embed.setThumbnail(subject.displayAvatarURL());
        }
    })
    .catch(err => console.log(err));

    return embed;
}