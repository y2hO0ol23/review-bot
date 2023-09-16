import 'dotenv/config';

import { ActionRowBuilder, CommandInteraction, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextBasedChannel, User } from "discord.js";
import { client, prisma } from "src";
import { like_button, review_ui, score_ui } from "@utils/ui";

export async function execute(interaction: CommandInteraction, subject: User) {
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

            const prev = new StringSelectMenuOptionBuilder()
            .setLabel(`▲`)
            .setDescription(`previous page`)

            const next = new StringSelectMenuOptionBuilder()
            .setLabel(`▼`)
            .setDescription(`next page`)

            const limit = parseInt(process.env.MENU_LIMIT ?? "10");
            
            const menu = new StringSelectMenuBuilder()
                .setCustomId(`review`)
                .setPlaceholder(`Reviews on ${subject.username} (1/${Math.ceil(options.length/limit)})`)
                .addOptions(options.slice(0, limit))
            
            if (options.length > limit) menu.addOptions(next.setValue(`next#${limit}`));

            await interaction.reply({
                ephemeral: true,
                components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)]
            })
            .then(msg => {
                msg.createMessageComponentCollector().on('collect', async component => {
                    if (!interaction.inCachedGuild()) return;
                    if (component.isStringSelectMenu()) {
                        if (component.values[0].startsWith('next')) {
                            const pivot = parseInt(component.values[0].split('#')[1]);

                            const menu = new StringSelectMenuBuilder()
                                .setCustomId(`review`)
                                .setPlaceholder(`Reviews on ${subject.username} (${Math.ceil(pivot/limit) + 1}/${Math.ceil(options.length/limit)})`)
                                .addOptions(prev.setValue(`prev#${pivot-limit}`))
                                .addOptions(options.slice(pivot, pivot+limit))

                            if (options.length - pivot > limit) menu.addOptions(next.setValue(`next#${pivot+limit}`));

                            await component.update({
                                components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)]
                            })
                        }
                        else if (component.values[0].startsWith('prev')) {
                            const pivot = parseInt(component.values[0].split('#')[1]);

                            const menu = new StringSelectMenuBuilder()
                                .setCustomId(`review`)
                                .setPlaceholder(`Reviews on ${subject.username}`)
                            
                            if (pivot) menu.addOptions(prev.setValue(`prev#${pivot-limit}`))
                            menu.addOptions(options.slice(pivot, pivot+limit))

                            if (options.length - pivot > limit) menu.addOptions(next.setValue(`next#${pivot+limit}`));

                            await component.update({ 
                                components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)] 
                            });
                        }
                        else {
                            const id = parseInt(component.values[0]);

                            await prisma.review.findUnique({
                                where: { id: id }
                            })
                            .then(async data => {
                                if (data) {
                                    if (data.messageLink) {
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
                                }
                                else {
                                    await interaction.editReply({ embeds: [await review_ui()], components: [] });
                                }
                            });
                        }
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