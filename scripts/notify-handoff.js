#!/usr/bin/env node

/**
 * Agent Handoff Notifier
 * Sends notifications to configured channels when handoffs occur
 */

const https = require('https');
const fs = require('fs');
const yaml = require('js-yaml'); // Would need to be added to dependencies

class HandoffNotifier {
  constructor(configPath = '.github/agent-handoff-config.yml') {
    this.config = this.loadConfig(configPath);
  }

  loadConfig(configPath) {
    try {
      const fileContents = fs.readFileSync(configPath, 'utf8');
      return yaml.load(fileContents);
    } catch (e) {
      console.error('Error loading config:', e);
      return {};
    }
  }

  async notify(handoffData) {
    const { fromAgent, toAgent, task, reference, url } = handoffData;
    
    const notifications = [];
    
    if (this.config.notifications?.slack?.enabled) {
      notifications.push(this.notifySlack(handoffData));
    }
    
    if (this.config.notifications?.discord?.enabled) {
      notifications.push(this.notifyDiscord(handoffData));
    }
    
    if (this.config.notifications?.email?.enabled) {
      notifications.push(this.notifyEmail(handoffData));
    }
    
    const results = await Promise.allSettled(notifications);
    
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Notification ${index} failed:`, result.reason);
      }
    });
    
    return results;
  }

  async notifySlack(handoffData) {
    const { fromAgent, toAgent, task, reference, url } = handoffData;
    
    const webhookUrl = process.env.SLACK_WEBHOOK_URL || this.config.notifications.slack.webhook_url;
    if (!webhookUrl || webhookUrl === '${SLACK_WEBHOOK_URL}') {
      throw new Error('Slack webhook URL not configured');
    }
    
    const message = {
      text: `Handoff from ${fromAgent} to ${toAgent}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🤝 Agent Handoff',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*From:*\n${fromAgent}`
            },
            {
              type: 'mrkdwn',
              text: `*To:*\n${toAgent}`
            },
            {
              type: 'mrkdwn',
              text: `*Task:*\n${task}`
            },
            {
              type: 'mrkdwn',
              text: `*Reference:*\n${reference}`
            }
          ]
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Handoff',
                emoji: true
              },
              url: url,
              style: 'primary'
            }
          ]
        }
      ]
    };
    
    return this.sendWebhook(webhookUrl, message);
  }

  async notifyDiscord(handoffData) {
    const { fromAgent, toAgent, task, reference, url } = handoffData;
    
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL || this.config.notifications.discord.webhook_url;
    if (!webhookUrl || webhookUrl === '${DISCORD_WEBHOOK_URL}') {
      throw new Error('Discord webhook URL not configured');
    }
    
    const message = {
      embeds: [{
        title: '🤝 Agent Handoff',
        color: 0x3498db,
        fields: [
          {
            name: 'From',
            value: fromAgent,
            inline: true
          },
          {
            name: 'To',
            value: toAgent,
            inline: true
          },
          {
            name: 'Task',
            value: task,
            inline: false
          },
          {
            name: 'Reference',
            value: reference,
            inline: false
          }
        ],
        url: url,
        timestamp: new Date().toISOString()
      }]
    };
    
    return this.sendWebhook(webhookUrl, message);
  }

  async notifyEmail(handoffData) {
    // Email notification would require a proper email service
    // This is a placeholder for the implementation
    console.log('Email notifications not yet implemented');
    return Promise.resolve();
  }

  sendWebhook(url, payload) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(payload);
      const urlObj = new URL(url);
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      };
      
      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, response: responseData });
          } else {
            reject(new Error(`Webhook failed with status ${res.statusCode}: ${responseData}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.write(data);
      req.end();
    });
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 4) {
    console.error('Usage: node notify-handoff.js <fromAgent> <toAgent> <task> <url>');
    process.exit(1);
  }
  
  const [fromAgent, toAgent, task, url] = args;
  const reference = process.env.GITHUB_SHA || 'manual';
  
  const notifier = new HandoffNotifier();
  
  notifier.notify({
    fromAgent,
    toAgent,
    task,
    reference,
    url
  }).then(() => {
    console.log('Notifications sent successfully');
  }).catch((error) => {
    console.error('Error sending notifications:', error);
    process.exit(1);
  });
}

module.exports = HandoffNotifier;
