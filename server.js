const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const RSSParser = require('rss-parser');
const path = require('path');
const phrases = require('./data/phrases.json');
const cities = require('./data/cities.json');
const { getWeatherIcon } = require('./scripts/weatherHelper');

dotenv.config();
const app = express();
const parser = new RSSParser();

app.set('view engine', 'ejs');
app.use(express.static('public'));

let phraseIndex = 0;
function getPhrase() {
  const phrase = phrases[phraseIndex];
  phraseIndex = (phraseIndex + 1) % phrases.length;
  return phrase;
}

async function getWeather(city) {
  try {
    const key = process.env.OPENWEATHER_KEY;
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${key}&lang=en`;
    const res = await axios.get(url);
    return {
      temp: res.data.main.temp,
      desc: res.data.weather[0].description,
      city: res.data.name,
      icon: getWeatherIcon(res.data.weather[0].description)
    };
  } catch {
    return { temp: '--', desc: 'Error getting weather', city: '' };
  }
}

let newsCache = [];
let newsIndex = 0;
async function getNews() {
  try {
    if (newsCache.length === 0) {
      const feed = await parser.parseURL('https://canaltech.com.br/rss/');
      newsCache = feed.items.map(item => ({
        title: item.title,
        link: item.link
      }));
    }
    const news = newsCache[newsIndex];
    newsIndex = (newsIndex + 1) % newsCache.length;
    return news;
  } catch (err) {
    return { title: 'Error getting news', link: '#' };
  }
}

app.get('/', async (req, res) => {
  const weather = await getWeather();
  const news = await getNews();
  const phrase = getPhrase();
  let today = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);
  today = capitalize(today);
  res.render('index', { weather, news, phrase, today });
});

app.get('/phrase', async (req, res) => {
  const phrase = await getPhrase();
  res.json({ phrase });
});

app.get('/weather', async (req, res) => {
  const allWeather = await Promise.all(cities.map(city => getWeather(city)));
  res.json(allWeather);
});

app.get('/news', async (req, res) => {
  const news = await getNews();
  res.json(news);
});

app.listen(3000, () => console.log('Dashboard running at http://localhost:3000'));