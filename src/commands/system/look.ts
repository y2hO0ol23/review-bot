import { CommandInteraction, SlashCommandBuilder, User } from "discord.js"
import { execute as execute_info } from "./look/info";
import { execute as execute_review } from "./look/review";

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
            await execute_info(interaction, subject);
        }
        else if (about == 'review') {
            await execute_review(interaction, subject);
        }
    },
}