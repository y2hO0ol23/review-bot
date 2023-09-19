import { EmbedBuilder, GuildMember, Interaction, TextBasedChannel, User } from "discord.js";
import { client, prisma } from "src";
import { like_button, review_ui } from "@utils/ui";
import { get_average, url_to_prisma_data } from "@utils/prisma";
import { give_role, remove_role } from "@utils/role";

client.on("interactionCreate", async (interaction: Interaction): Promise<any> => {
    if (!interaction.inCachedGuild()) return;
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) return;
        
        await command.execute({
            interaction: interaction,
            client: client
        });
    }
    
    if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('review')) {
            await interaction.deferReply();
            const subject = await interaction.guild.members.fetch(interaction.customId.split('#')[1]) as GuildMember;
            
            const score: number = Math.max(interaction.fields.getTextInputValue('score').split('★').length - 1, 1);
            const title: string = interaction.fields.getTextInputValue('title');
            const content: string = interaction.fields.getTextInputValue('content');

            // remove last review that author is same
            await prisma.review.findMany({
                where: {
                    authorId: interaction.user.id,
                    subjectId: subject.id
                }
            })
            .then(async data => {
                if (data.length && data[0].messageLink) {
                    var [_, channelId, messageId] = data[0].messageLink.split('/');
                    await client.channels.fetch(channelId)
                    .then(async channel => {       
                        await (channel as TextBasedChannel).messages.fetch(messageId)
                        .then(async msg => { await msg.delete(); }).catch(()=>{});
                        
                        await prisma.review.delete({
                            where: { id: data[0].id }
                        });
                    })
                    .catch(()=>{});
                }
            });
            
            // add new review
            await prisma.review.create({
                data: {
                    authorId: interaction.user.id,
                    subjectId: subject.id,
                    score: score,
                    title: title,
                    content: content,
                    like: 1,
                    likes: {
                        connect: { id: interaction.user.id }
                    }
                }
            })
            .then(async data => {
                await interaction.editReply({ 
                    embeds: [await review_ui(data.id)],
                    components: [like_button(data.id)],
                })
                .then(async msg => {
                    await prisma.review.update({
                        where: { id: data.id },
                        data: { messageLink: `${url_to_prisma_data(msg.url)}`}
                    });
                    
                    // send to dm
                    const embed = new EmbedBuilder()
                        .setColor(0x111111)
                        .setFields([
                            {
                                name: `🔔 You were reviewed`,
                                value: `➥ ${msg.url}`,
                            }
                        ]);

                    await subject.send({ embeds: [embed] }).catch(()=>{});
                });
            })
            .catch(console.error);

            //update role
            await remove_role(subject);
            await give_role(subject);
        }
    }
    if (interaction.isButton()) {
        if (interaction.customId.startsWith('like')) {
            const id = parseInt(interaction.customId.split('#')[1]);

            await prisma.review.findUnique({
                where: { id: id },
                include: { likes: true, hates: true }
            })
            .then(async data => {
                if (data) {
                    if (!data.likes.find(data => data.id == interaction.user.id)) {
                        if (data.hates.find(data => data.id == interaction.user.id)) {
                            await prisma.review.update({
                                where: { id: data.id },
                                data: { 
                                    like: { increment: 2 },
                                    likes: { connect: { id: interaction.user.id } },
                                    hates: { disconnect: { id: interaction.user.id } }
                                }
                            });
                        }
                        else {
                            await prisma.review.update({
                                where: { id: data.id },
                                data: { 
                                    like: { increment: 1 },
                                    likes: {
                                        connect: { id: interaction.user.id }
                                    }
                                }
                            });
                        }
                            
                        await interaction.message.edit({ embeds: [await review_ui(data.id)] });
                    }
                }
                else {
                    await interaction.message.edit({ embeds: [await review_ui()], components: [] });
                }
                await interaction.deferUpdate();
            })
            .catch(console.error);
        }
        if (interaction.customId.startsWith('hate')) {
            const id = parseInt(interaction.customId.split('#')[1]);

            await prisma.review.findUnique({
                where: { id: id },
                include: { likes: true, hates: true }
            })
            .then(async data => {
                if (data) {
                    if (!data.hates.find(data => data.id == interaction.user.id)) {
                        if (data.likes.find(data => data.id == interaction.user.id)) {
                            await prisma.review.update({
                                where: { id: data.id },
                                data: { 
                                    like: { decrement: 2 },
                                    hates: { connect: { id: interaction.user.id } },
                                    likes: { disconnect: { id: interaction.user.id } }
                                }
                            });
                        }
                        else {
                            await prisma.review.update({
                                where: { id: data.id },
                                data: { 
                                    like: { decrement: 1 },
                                    hates: { connect: { id: interaction.user.id }}
                                }
                            });
                        }
                            
                        await interaction.message.edit({ embeds: [await review_ui(data.id)] });
                    }
                }
                else {
                    await interaction.message.edit({ embeds: [await review_ui()], components: [] });
                }
                await interaction.deferUpdate();
            })
            .catch(console.error);
        }
    }
});
