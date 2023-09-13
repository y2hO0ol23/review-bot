import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Embed, EmbedBuilder, Interaction, User } from "discord.js";
import { client, prisma } from "../../index";
import { like_button, review_ui } from "../../utils/ui";

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
            
            const score: number = Math.max(interaction.fields.getTextInputValue('score').lastIndexOf('★') + 1, 1);
            const title: string = interaction.fields.getTextInputValue('title');
            const content: string = interaction.fields.getTextInputValue('content');
            
            if (await prisma.user.findUnique({
                where: { id: interaction.user.id }
            })) {/* exist */}
            else {
                await prisma.user.create({
                    data: { id: interaction.user.id }
                });
            }

            await prisma.user.findUnique({
                where: { id: subject.id }
            })
            .then(async data => {
                if (!data) {
                    data = await prisma.user.create({
                        data: { id: subject.id }
                    });
                }
                await prisma.review.deleteMany({
                    where: {
                        authorId: interaction.user.id,
                        subjectId: subject.id
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
                    });
                })
                .catch(err => console.log(err));
            })
            .catch(err => console.log(err));
        }
    }
    if (interaction.isButton()) {
        if (interaction.customId.startsWith('like')) {
            await interaction.deferReply({ ephemeral: true });

            const id = parseInt(interaction.customId.split('#')[1]);

            await prisma.review.findUnique({
                where: { id: id },
                include: { likes: true }
            })
            .then(async data => {
                if (data) {
                    if (data.likes.find(data => data.id == interaction.user.id)) {
                        return interaction.followUp({ content: '`You already likes it`' })
                    }
                    else {
                        await prisma.user.findUnique({
                            where: { id: interaction.user.id }
                        })
                        .then(async data => {
                            if (data) return;       
                            await prisma.user.create({
                                data: { id: interaction.user.id }
                            })
                        })
                        .catch(err => console.log(err));

                        await prisma.review.update({
                            where: { id: data.id },
                            data: { 
                                like: { increment: 1 },
                                likes: {
                                    connect: { id: interaction.user.id }
                                }
                            }
                        });
                            
                        await interaction.message.edit({ embeds: [await review_ui(data.id)] });
                    }
                }
                else {
                    await interaction.message.edit({ embeds: [await review_ui()], components: [] });
                }
                await interaction.deleteReply();
            })
            .catch(err => console.log(err));
        }
    }
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId == 'review') {
            const id = parseInt(interaction.values[0]);
            const embed = await review_ui(id);
            await interaction.reply({ embeds: [embed] });

            if (!embed.data.footer) return;

            await interaction.editReply({
                components: [like_button(id)]
            });
        }
    }
});
