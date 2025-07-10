const express = require('express');
const OAuth = require('oauth').OAuth;
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

const oauth = new OAuth(
  'https://api.login.yahoo.com/oauth/v2/get_request_token',
  'https://api.login.yahoo.com/oauth/v2/get_token',
  process.env.YAHOO_CONSUMER_KEY,
  process.env.YAHOO_CONSUMER_SECRET,
  '1.0',
  process.env.CALLBACK_URL,
  'HMAC-SHA1'
);

let oauthAccessToken = '';
let oauthAccessTokenSecret = '';

app.get('/login', (req, res) => {
  oauth.getOAuthRequestToken((error, oauthToken, oauthTokenSecret) => {
    if (error) {
      console.error('Request token error:', error);
      return res.status(500).send('Error getting OAuth token');
    }
    req.session = { oauthToken, oauthTokenSecret };
    const authURL = `https://api.login.yahoo.com/oauth/v2/request_auth?oauth_token=${oauthToken}`;
    res.redirect(authURL);
  });
});

app.get('/callback', (req, res) => {
  const { oauth_token, oauth_verifier } = req.query;
  const { oauthToken, oauthTokenSecret } = req.session;

  oauth.getOAuthAccessToken(
    oauth_token,
    oauthTokenSecret,
    oauth_verifier,
    (error, accessToken, accessTokenSecret) => {
      if (error) {
        console.error('Access token error:', error);
        return res.status(500).send('OAuth callback failed');
      }

      oauthAccessToken = accessToken;
      oauthAccessTokenSecret = accessTokenSecret;
      res.send('✅ Login successful. You can now access /teams');
    }
  );
});

app.get('/teams', async (req, res) => {
  const url = 'https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games;game_keys=nfl/teams?format=json';

  oauth.get(
    url,
    oauthAccessToken,
    oauthAccessTokenSecret,
    (err, data) => {
      if (err) {
        console.error('Teams fetch error:', err);
        return res.status(500).send('Failed to fetch teams');
      }
      res.setHeader('Content-Type', 'application/json');
      res.send(data);
    }
  );
});

app.listen(port, () => {
  console.log(`Yahoo OAuth1 proxy running on port ${port}`);
});