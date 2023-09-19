import { url_to_prisma_data } from "@utils/prisma";
import { give_role, remove_role } from "@utils/role";
import { like_button, review_ui } from "@utils/ui";
import { EmbedBuilder, GuildMember, ModalSubmitInteraction, TextBasedChannel } from "discord.js";
import { client, prisma } from "src";

export default async function review(interaction: ModalSubmitInteraction<"cached">) {
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

    //update role
    await remove_role(subject);
    await give_role(subject);
}