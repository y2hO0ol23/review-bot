import { CommandInteraction, EmbedBuilder, User } from "discord.js";
import { prisma } from "src";
import { count_ui, score_ui } from "@utils/ui";
import { get_average } from "@utils/prisma";

export async function execute(interaction: CommandInteraction, subject: User) {
    await prisma.review.findMany({
        where: { subjectId: subject.id },
        orderBy: { like: "desc" }
    })
    .then(async data => {
        const average = get_average(data);
        
        const embed = new EmbedBuilder()
            .setColor(0x111111)
            .setDescription(`<@${subject.id}> **⭐${average.toFixed(1)} (${count_ui(data.length)})**`)
            .setThumbnail(subject.displayAvatarURL())
            .setFields([
                {
                    name: `📑 No reviews`,
                    value: '``` ```',
                }
            ]);

        if (data.length) {
            embed.setFields([
                {
                    name: `📑 ${data[0].title} 〔${score_ui(data[0].score)}〕`,
                    value: `\`\`\`${data[0].content}\`\`\``,
                }
            ])
            .setFooter({ text: `👍 ${data[0].like}` });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true })
    })
    .catch(console.error);
}