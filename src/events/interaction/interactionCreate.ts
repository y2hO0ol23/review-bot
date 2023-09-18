import { EmbedBuilder, Interaction, TextBasedChannel, User } from "discord.js";
import { client, prisma } from "src";
import { like_button, review_ui } from "@utils/ui";
import { create_user_when_not_exist, url_to_prisma_data } from "@utils/prisma";

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
            const subject: User = await client.users.fetch(interaction.customId.split('#')[1]) as User;
            
            const score: number = Math.max(interaction.fields.getTextInputValue('score').split('★').length - 1, 1);
            const title: string = interaction.fields.getTextInputValue('title');
            const content: string = interaction.fields.getTextInputValue('content');
            
            await create_user_when_not_exist(interaction.user.id);

            await prisma.user.findUnique({
                where: { id: subject.id }
            })
            .then(async data => {
                if (!data) {
                    data = await prisma.user.create({
                        data: { id: subject.id }
                    });
                }
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

                        await subject.send({ embeds: [embed] });
                    });
                })
                .catch(err => console.log(err));
            })
            .catch(err => console.log(err));
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
                        await create_user_when_not_exist(interaction.user.id);

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
            .catch(err => console.log(err));
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
                        await create_user_when_not_exist(interaction.user.id);

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
            .catch(err => console.log(err));
        }
    }
});
