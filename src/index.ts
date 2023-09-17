import 'dotenv/config';

import { ApplicationCommandDataResolvable, Client, Collection, GatewayIntentBits, Partials } from "discord.js";
import { PrismaClient } from '@prisma/client'
import fs from "fs";
import path from "path";

declare module "discord.js" {
    export interface Client {
        commands: Collection<string, any>;
    }
};

export const prisma = new PrismaClient();
export const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
    ],
    partials: [
        Partials.User,
        Partials.Channel,
        Partials.GuildMember,
        Partials.Message
    ],
});

// set commands
client.commands = new Collection();
const commandsArray: ApplicationCommandDataResolvable[] = new Array();
const commandsPath = path.join(__dirname, './commands');

fs.readdirSync(commandsPath).forEach(category => {
    fs.readdirSync(path.join(commandsPath, category)).filter(e => e.endsWith('.ts')).forEach(async file => {
        const command = (await import(path.join(commandsPath, category, file))).default;
        
        client.commands.set(command.data.name, command);
        commandsArray.push(command.data.toJSON());
    })
})

client.on("ready", async () => {
    await client.application?.commands.set(commandsArray);
})

// set events
const eventsPath = path.join(__dirname, './events');
fs.readdirSync(eventsPath).forEach(category => {
    fs.readdirSync(path.join(eventsPath, category)).filter(e => e.endsWith('.ts')).forEach(async file => {
        await import(path.join(eventsPath, category, file));
    })
});

if (process.env) {
    client.login(process.env.token).then(() => {
        console.log(`${client.user?.username} is ready!`);
        client.user?.setActivity({ name: '/review' });
    })
}
else console.log('Need to set .env');
