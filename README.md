# Presencify

Presencify is a Discord bot that tries to guess if a user is available or not, and lets people know based on that info.
There are a couple of things you need to understand.

## Factors

- The current status of the user (not really reliable)
  - Online
  - Idle
  - Do not disturb
  - Offline
- The last time the user sent a message
  - < 1 minute
  - < 10 minutes
  - < 1 hour
  - More
- What UTC hour it is
  - 0-24
- What UTC day it is
  - Mon-Sun

Presencify then uses Bayesian analysis to determine if the user is available or not.
Data is recorded every time a user is mentioned.

## What does being "available" mean?

If the user will send a message in the next 10 minutes, then the user is available.
