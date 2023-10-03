// bot.js

require('dotenv').config();

const { Client, Intents } = require('discord.js');
const intents = new Intents([
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILDS
]);

const client = new Client({ intents });
const { BOT_TOKEN } = require('./token.env');
const dropboxApi = require('./dropboxApi'); 

client.once('ready', async () => {
    console.log('Bot is online!');
    await dropboxApi.initializeDropbox();
});

client.on('messageCreate', async (message) => {
    console.log('A message was received:', message.content);

    if (message.author.bot) {
        console.log('Message is from a bot, ignoring.');
        return;
    }

    if (!message.content.startsWith('!')) {
        console.log('Message does not start with "!", ignoring.');
        return;
    }

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    console.log(`Command received: ${command}`);

    if (command === 'setup') {
        const channelName = args.join('-');
        console.log(`Received command: ${command}`);

        // Your predefined folder structure
        const folderStructure = [
            '00_Client',
            '01_Creative',
            '02_Development',
            '03_For Client',
            '04_Final',
            '00_Client/1_Brief',
            '00_Client/2_Assets',
            '00_Client/3_References',
            '00_Client/4_Comments',
            '00_Client/3_References/Audio',
            '00_Client/3_References/Images',
            '00_Client/3_References/Videos',
            '01_Creative/00_Pre_Production',
            '01_Creative/01_Design',
            '01_Creative/02_Animatics',
            '01_Creative/03_Production',
            '01_Creative/04_Audio',
            '01_Creative/05_Freelancers',
            '01_Creative/00_Pre_Production/00_Project_Plan',
            '01_Creative/00_Pre_Production/01_Concept',
            '01_Creative/00_Pre_Production/02_Storyboards',
            '01_Creative/01_Design/00_Pitch',
            '01_Creative/01_Design/01_Styleframes',
            '01_Creative/01_Design/02_Assets',
            '01_Creative/01_Design/00_Pitch/Set_01',
            '01_Creative/01_Design/00_Pitch/Set_02',
            '01_Creative/01_Design/00_Pitch/Set_03',
            '01_Creative/01_Design/01_Styleframes/00_References',
            '01_Creative/01_Design/01_Styleframes/01_Photoshop',
            '01_Creative/01_Design/01_Styleframes/02_Illustrator',
            '01_Creative/01_Design/01_Styleframes/03_AfterEffects',
            '01_Creative/01_Design/01_Styleframes/04_Output',
            '01_Creative/01_Design/01_Styleframes/01_Photoshop/F00-00',
            '01_Creative/01_Design/01_Styleframes/02_Illustrator/F00-00',
            '01_Creative/01_Design/01_Styleframes/03_AfterEffects/F00-00',
            '01_Creative/02_Animatics/00_Photoshop',
            '01_Creative/02_Animatics/01_AfterEffects',
            '01_Creative/02_Animatics/02_Renders',
            '01_Creative/03_Production/00_AfterEffects',
            '01_Creative/03_Production/01_Cinema4D',
            '01_Creative/03_Production/02_FramebyFrame',
            '01_Creative/03_Production/03_Premiere',
            '01_Creative/03_Production/04_Stills',
            '01_Creative/03_Production/00_AfterEffects/0_Working_Files',
            '01_Creative/03_Production/00_AfterEffects/1_Rendered',
            '01_Creative/03_Production/01_Cinema4D/0_Working_Files',
            '01_Creative/03_Production/01_Cinema4D/1_Rendered',
            '01_Creative/03_Production/02_FramebyFrame/0_Working_Files',
            '01_Creative/03_Production/02_FramebyFrame/1_Rendered',
            '01_Creative/03_Production/03_Premiere/0_Working_Files',
            '01_Creative/03_Production/03_Premiere/1_Rendered',
            '01_Creative/03_Production/04_Stills/0_Working_Files',
            '01_Creative/03_Production/04_Stills/1_Rendered',
            '01_Creative/04_Audio/00_Music',
            '01_Creative/04_Audio/01_Voiceover',
            '01_Creative/04_Audio/02_Sound_Design',
            '01_Creative/04_Audio/03_Working_Files',
            '01_Creative/04_Audio/04_Final_Mixdown',
            '01_Creative/05_Freelancers/00_Common_Brief',
            '01_Creative/05_Freelancers/01_For_Freelancers',
            '01_Creative/05_Freelancers/02_From_Freelancers',
        ];

        try {
            const progressMessage = await message.reply('Creating folder structure, please wait...');
            await dropboxApi.createRootFolderWithFetch(channelName);
        
            for (const folder of folderStructure) {
                const result = await dropboxApi.createFolder(channelName, folder);
                if (result === 'folder_exists') {
                  message.channel.send('A folder with the given name already exists. Please remove or delete the folder if you would like to create the folder structure again.');
                  return; // Stop the execution if a folder already exists
                }
            }

            // Send message that folder structure has been created
            await message.channel.send(`Folder structure for channel ${channelName} has been created. Now creating the shared Dropbox link...`);
        
            const folderPath = `/${channelName}`;
            const sharedLink = await dropboxApi.createSharedLinkWithRetry(folderPath);
            
            await progressMessage.edit(`Folder structure for channel ${channelName} created successfully.`);
            message.channel.send(`Here is the Dropbox link to the new folder: ${sharedLink}`);
            
        } catch (error) {
            console.error(error);
            message.channel.send('An error occurred while creating the folder structure. Check the console for more details.');
        }        
    }
});

client.login(BOT_TOKEN);