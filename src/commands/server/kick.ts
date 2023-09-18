import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, TextBasedChannel, User } from "discord.js"
import { client, prisma } from "src";

export default {
    data: new SlashCommandBuilder()
        .setName("kick")
        .setDescription(`kick this bot`)
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    execute: async function ({ interaction }: { interaction: CommandInteraction }) {
        if (!interaction.isChatInputCommand() || !interaction.inCachedGuild()) return;

        const embed = new EmbedBuilder()
            .setColor(0x111111)
            .setDescription(`**Are you sure you want to kick <@${client.user?.id}> from the server?**`);
            
        const button = new ButtonBuilder()
            .setCustomId(`kick`)
            .setLabel('🚫')
            .setStyle(ButtonStyle.Danger);

        await interaction.reply({
            embeds: [embed],
            components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)],
            ephemeral: true
        })
        .then(msg => {
            msg.createMessageComponentCollector().on('collect', async component => {
                if (!interaction.inCachedGuild()) return;
                if (component.isButton()) {
                    await interaction.deleteReply();
                    // remove roles
                    await prisma.role.findMany({
                        where: { guildId: interaction.guildId },
                    })
                    .then(async data => {
                        for (var e of data) {
                            await interaction.guild.roles.fetch(e.id)
                            .then(async role => await role?.delete())
                            .catch(()=>{});
                        }
                    });
                
                    await prisma.role.deleteMany({
                        where: { guildId: interaction.guildId },
                    })
                    // remove reviews (only message not data)
                    await prisma.review.findMany({
                        where: { messageLink: { startsWith: `${interaction.guildId}/` }}
                    })
                    .then(async data => {
                        for (var e of data) {
                            if (e.messageLink){
                                const [_, channelId, messageId] = e.messageLink.split('/');
                                await client.channels.fetch(channelId)
                                .then(async channel => {
                                    await (channel as TextBasedChannel).messages.fetch(messageId)
                                    .then(async msg => await msg.delete());
                                })
                                .catch(()=>{});
                            }
                        }
                    });

                    await interaction.guild.leave();
                }
            });
        })
    },
}