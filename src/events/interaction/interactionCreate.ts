import { Interaction } from "discord.js";
import { client } from "src";
import modal_review from "./interactionCreate/modal/review";
import button_like from "./interactionCreate/button/like";
import button_hate from "./interactionCreate/button/hate";

client.on("interactionCreate", async (interaction: Interaction): Promise<any> => {
    if (!interaction.inCachedGuild()) return;
    try {
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
                await modal_review(interaction);
            }
        }
        if (interaction.isButton()) {
            if (interaction.customId.startsWith('like')) {
                await button_like(interaction);
            }
            if (interaction.customId.startsWith('hate')) {
                await button_hate(interaction);
            }
        }
    }
    catch (e) {
        console.error(e);
    }
});
