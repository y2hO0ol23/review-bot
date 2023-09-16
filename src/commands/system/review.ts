import { CommandInteraction, SlashCommandBuilder, User } from "discord.js"
import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from "discord.js";
import { prisma } from "src";

export default {
    data: new SlashCommandBuilder()
        .setName("review")
        .setDescription("reivew user")
        .setDMPermission(false)
        .addUserOption(option =>
            option.setName('subject')
                .setDescription('Select subject')
                .setRequired(true)),

    execute: async function ({ interaction }: { interaction: CommandInteraction }) {
        if (!interaction.isChatInputCommand() || !interaction.inCachedGuild()) return;

        const subject = interaction.options.getUser('subject') as User;
        if (subject.id == interaction.user.id) {
            return await interaction.reply({ content: '`Do not review for your self.`', ephemeral: true });
        }

        const modal = new ModalBuilder()
			.setCustomId(`review#${subject.id}`)
			.setTitle(`Review > ${subject.username}`)

        const score = new TextInputBuilder()
			.setCustomId('score')
			.setLabel("Score")
            .setValue("★★★★★")
            .setPlaceholder("☆")
			.setStyle(TextInputStyle.Short)
            .setMinLength(1)
            .setMaxLength(5)

        const title = new TextInputBuilder()
			.setCustomId('title')
			.setLabel("Title")
			.setStyle(TextInputStyle.Short)
            .setMinLength(1)
            .setMaxLength(16)

        const content = new TextInputBuilder()
			.setCustomId('content')
			.setLabel("Content")
			.setStyle(TextInputStyle.Paragraph)
            .setMinLength(1)
            .setMaxLength(256)
            
        await prisma.user.findUnique({
            where: { id: subject.id }
        })
        .then(async data => {
            if (data) {
                await prisma.review.findMany({
                    where: {
                        authorId: interaction.user.id,
                        subjectId: subject.id
                    }
                })
                .then(data => {
                    if (data.length) {
                        modal.setTitle(`Edit > ${subject.username}`);
                        score.setValue("★".repeat(data[0].score));
                        title.setValue(data[0].title);
                        content.setValue(data[0].content);
                    }
                })
                .catch(err => console.log(err));
            }
        })
        .catch(err => console.log(err));
        
		modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(score),
            new ActionRowBuilder<TextInputBuilder>().addComponents(title),
            new ActionRowBuilder<TextInputBuilder>().addComponents(content),
        );
        
		await interaction.showModal(modal);
    },
}