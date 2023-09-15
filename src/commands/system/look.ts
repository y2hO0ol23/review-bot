import { CommandInteraction, SlashCommandBuilder, User, EmbedBuilder, ActionRowBuilder, StringSelectMenuOptionBuilder, StringSelectMenuBuilder, TextBasedChannel } from "discord.js"
import { prisma, client } from "../..";
import { score_ui, count_ui, review_ui, like_button } from "../../utils/ui";

export default {
    data: new SlashCommandBuilder()
        .setName("look")
        .setDescription('look about ...')
        .setDMPermission(false)
        .addSubcommand(subcommand =>
            subcommand
            .setName('info')
            .setDescription('look about user info')
            .addUserOption(option =>
                option.setName('subject')
                    .setDescription('Select subject')
                    .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
            .setName('review')
            .setDescription('look about review')
            .addUserOption(option =>
                option.setName('subject')
                    .setDescription('Select subject')
                    .setRequired(true))),

    execute: async function ({ interaction }: { interaction: CommandInteraction }) {
        if (!interaction.isChatInputCommand() || !interaction.inCachedGuild()) return;

        const subject = interaction.options.getUser('subject') as User;
        const about = interaction.options.getSubcommand() as string;
        
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
                    .setDescription(`<@${subject.id}> **⭐${average.toFixed(1)} (${count_ui(data.length)})**`)
                    .setThumbnail(subject.displayAvatarURL());

                if (data.length) {
                    embed.addFields([
                        {
                            name: `📑 ${data[0].title} 〔${score_ui(data[0].score)}〕`,
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
                        if (e.messageLink) {
                            const author = await client.users.fetch(e.authorId);
    
                            options.push(
                                new StringSelectMenuOptionBuilder()
                                    .setLabel(`${e.title} 〔${score_ui(e.score)}〕 - ${author ? author.username : "unknown"}`)
                                    .setDescription(`👍 ${e.like}`)
                                    .setValue(`${e.id}`)
                            )
                        }
                    }
                    
                    const menu = new StringSelectMenuBuilder()
                        .setCustomId(`review`)
                        .setPlaceholder(`List about: ${subject.username}`)
                        .addOptions(options);

                    await interaction.reply({
                        ephemeral: true,
                        components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
                        flags: "Ephemeral"
                    })
                    .then(msg => {
                        msg.createMessageComponentCollector().on('collect', async component => {
                            if (component.isStringSelectMenu()) {
                                const id = parseInt(component.values[0]);

                                await prisma.review.findUnique({
                                    where: { id: id }
                                })
                                .then(async data => {
                                    if (data?.messageLink) {
                                        var [_, channelId, messageId] = data.messageLink.split('/');
                                        await client.channels.fetch(channelId)
                                        .then(async channel => {
                                            await (channel as TextBasedChannel).messages.fetch(messageId)
                                            .then(async () => {
                                                // if message exist
                                                const embed = new EmbedBuilder()
                                                    .setColor(0x111111)
                                                    .setFields([
                                                        {
                                                            name: `📝 ${data.title} 〔${score_ui(data.score)}〕`,
                                                            value: `➥ https://discord.com/channels/${data.messageLink}`,
                                                        }
                                                    ]);
                                                await interaction.editReply({ embeds: [embed], components: [] });
                                            });
                                        })
                                        .catch(async () => {
                                            // if message not exist
                                            if (interaction.channel) {
                                                const message = await interaction.channel.send({ embeds: [await review_ui(id)], components: [like_button(id)] });
    
                                                await prisma.review.update({
                                                    where: { id: id },
                                                    data: { messageLink: `${message.url.slice(29)}` }
                                                });
                                                
                                                await interaction.deleteReply();
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    })
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