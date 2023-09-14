import { CommandInteraction, SlashCommandBuilder, User, EmbedBuilder, ActionRowBuilder, StringSelectMenuOptionBuilder, StringSelectMenuBuilder, TextBasedChannel } from "discord.js"
import { prisma, client } from "../..";
import { score_ui, count_ui, review_ui, like_button } from "../../utils/ui";

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
                    .setDescription(`➥ <@${subject.id}>`)
                    .setThumbnail(subject.displayAvatarURL());

                if (data.length) {
                    embed.addFields([
                        {
                            name: `Best Review: ${data[0].title} [${score_ui(data[0].score)}]`,
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
                                    if (data) {
                                        var [guildId, channelId, messageId] = data.messageLink.split('/');
                                        var channel = await client.channels.fetch(channelId);
                                        
                                        await (channel as TextBasedChannel).messages.fetch(messageId)
                                        .then(async () => {
                                            // if message exist
                                            const embed = new EmbedBuilder()
                                                .setColor(0x111111)
                                                .setFields([
                                                    {
                                                        name: `📝 ${data.title} [${score_ui(data.score)}]`,
                                                        value: `➥ https://discord.com/channels/${guildId}/${channelId}/${messageId}`,
                                                    }
                                                ]);
    
                                            await interaction.editReply({ embeds: [embed], content: '', components: [] });
                                        }).catch(async () => {
                                            // if message not exist
                                            if (interaction.channel) {
                                                const message = await interaction.channel.send({ embeds: [await review_ui(id)], components: [like_button(id)] });
    
                                                guildId = message.guildId as string;
                                                channelId = message.channelId as string;
                                                messageId = message.id as string;
    
                                                await prisma.review.update({
                                                    where: { id: id },
                                                    data: { messageLink: `${guildId}/${channelId}/${messageId}` }
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