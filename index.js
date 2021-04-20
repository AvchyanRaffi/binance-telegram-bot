require('dotenv').config('.env');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const { parse } = require('json2csv');
const EventSource = require('eventsource');
const fs = require('fs');

const TelegramToken = process.env.TOKEN;
const apiUrl = process.env.API_URL;

const bot = new TelegramBot(TelegramToken, { polling: true });
bot.onText(/\/init (.+)/, async function(msg, match) {
    const { id } = msg.chat;
    const [key, secret] = match[1].split(' ');
    const res = await axios.get(`${apiUrl}init?key=${key}&secret=${secret}`);
    await bot.sendMessage(id, res.data.token);
});

bot.onText(/\/destroy (.+)/, async function(msg, match) {
    const { id } = msg.chat;
    const token = match[1];
    const res = await axios.delete(`${apiUrl}destroy?token=${token}`);
    if (res.status === 204) {
        await bot.sendMessage(id, 'destroyed');
    }
});

bot.onText(/\/getAllTradingPairs (.+)/, async function(msg, match) {
    const { id } = msg.chat;
    const token = match[1];
    const res = await axios.get(`${apiUrl}getAllTradingPairs?token=${token}`);
    const fields = ['symbol', 'bid',  'low', 'high', 'change'];
    const opts = { fields };

    try {
        const csv = parse(Object.keys(res.data).map(k => { 
            return { 
                symbol: res.data[k].symbol, 
                bid: res.data[k].bid,
                low: res.data[k].low,
                high: res.data[k].high,
                change: res.data[k].change,
            } 
        }), opts);

        fs.writeFileSync('./files/test.csv', csv)
        await bot.sendDocument(id, fs.createReadStream('./files/test.csv'), {__filename: 'csv'});
        fs.unlinkSync('./files/test.csv')
    } catch (err) {
        console.error(err);
    }
});

bot.onText(/\/createAlert (.+)/, async function(msg, match) {
    const { id } = msg.chat;
    const [token, pair, min, max] = match[1].split(' ');
    const res = await axios.post(`${apiUrl}createAlert`, {
        token,
        pair,
        min,
        max,
    });
    await bot.sendMessage(id, res.data.alertToken);
});

bot.onText(/\/alertPull (.+)/, async function(msg, match) {
    const { id } = msg.chat;
    const token = match[1];
    const eventSource = new EventSource(`${apiUrl}alertPull?token=${token}`);
    eventSource.onmessage = ({ data }) => {
      bot.sendMessage(id, `Result: ${data}`); 
    };
});

bot.onText(/\/getUserBalance (.+)/, async function(msg, match) {
    const { id } = msg.chat;
    const token = match[1];
    const res = await axios.get(`${apiUrl}getUserBalance?token=${token}`);
    await bot.sendMessage(id, `${JSON.stringify(res.data)}`);
});
