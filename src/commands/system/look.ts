import { CommandInteraction, SlashCommandBuilder, User, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuOptionBuilder, StringSelectMenuBuilder } from "discord.js"
import { prisma, client } from "../..";
import { score_ui, count_ui, review_ui } from "../../utils/ui";

export default {
    data: new SlashCommandBuilder()
        .setName("look")
        .setDescription("look for ...")
        .setDMPermission(false)
        .addUserOption(option =>
            option.setName('subject')
                .setDescription('Select subject')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('about')
                .setDescription('Select what you want to look at')
                .setRequired(true)
                .addChoices(
                    { name: 'info', value: 'info' },
                    { name: 'review', value: 'review' },
                )),

    execute: async function ({ interaction }: { interaction: CommandInteraction }) {
        if (!interaction.isChatInputCommand() || !interaction.inCachedGuild()) return;

        const subject = interaction.options.getUser('subject') as User;
        const about = interaction.options.getString('about') as string;
        
        if (about == 'info') {
            await prisma.review.findMany({
                where: { subjectId: subject.id },
                orderBy: { like: "desc" }
            })
            .then(async data => {
                let average: number = 0.0;
                if (data.length) {
                    average = data.reduce((acc, data) => {
                        return acc + data.score;
                    }, 0.0) / data.length;
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0x111111)
                    .setTitle(`${score_ui(average)} ${average.toFixed(1)} (${count_ui(data.length)})`)
                    .setDescription(`About <@${subject.id}>`)
                    .setThumbnail(subject.displayAvatarURL());

                if (data.length) {
                    embed.addFields([
                        {
                            name: `Best review : ${data[0].title} [${score_ui(data[0].score)}]`,
                            value: `\`\`\`${data[0].content}\`\`\``,
                        }
                    ])
                    .setFooter({ text: `👍 ${data[0].like}` });
                }

                await interaction.reply({ embeds: [embed] });
            })
            .catch(err => console.log(err));
        }
        else if (about == 'review') {
            await prisma.review.findMany({
                where: { subjectId: subject.id },
                orderBy: { like: "desc" }
            })
            .then(async data => {
                if (data.length) {
                    const options: StringSelectMenuOptionBuilder[] = []

                    for (var e of data) {
                        const author = await client.users.fetch(e.authorId);

                        options.push(
                            new StringSelectMenuOptionBuilder()
                                .setLabel(`${e.title} [${score_ui(e.score)}] - ${author ? author.username : "unknown"}`)
                                .setDescription(`👍 ${e.like}`)
                                .setValue(`${e.id}`)
                        )
                    }
                    
                    const menu = new StringSelectMenuBuilder()
                        .setCustomId(`review`)
                        .setPlaceholder(`List for ${subject.username}`)
                        .addOptions(options);

                    await interaction.reply({
                        ephemeral: true,
                        components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)]
                    });
                }
                else {
                    await interaction.reply({ 
                        ephemeral: true,
                        content: '`No review exists`' 
                    });
                }
            })
            .catch(err => console.log(err));
        }
    },
}