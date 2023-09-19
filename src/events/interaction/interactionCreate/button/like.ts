import { review_ui } from "@utils/ui";
import { ButtonInteraction } from "discord.js";
import { prisma } from "src";

export default async function like(interaction: ButtonInteraction<"cached">) {
    const id = parseInt(interaction.customId.split('#')[1]);

    await interaction.deferUpdate();
    
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
    })
}