# MJAI Batch Review

## Introduction

A simple script to review one's recent MajSoul logs using Mortal, and to generate a report of the results.

## Requirements

- **Mortal**: refers to [Mortal's Document](https://mortal.ekyu.moe/user/build.html)
- **mjai-reviewer**: refers to [mjai-reviewer's Document](https://github.com/Equim-chan/mjai-reviewer)
- You also need a trained model file to actually use Mortal.
- **[Node.js](https://nodejs.org/)**

You need to ensure you can run `mjai-reviewer` with `mortal` model successfully.

## Preparation

1. Clone this repository.
2. Install the required packages by running `npm install`.
3. Copy `config.example.ts` to `config.ts` and fill in the required information, instructions are in the comments.
4. You may need to change `httpBase` and `wsGateway` in `config.ts` to match the region of your temporary account (You can find these with Browser's Developer Tools).
5. Activate your mortal environment.

## Usage

Run

```bash
npm start <id> [limit]
```

where `<id>` is the MajSoul number ID of the player you want to review, and `[limit]` is the number of logs you want to review (default 100).

You can get the MajSoul number ID from [MajSoul Stats](https://amae-koromo.sapk.ch/), ID is in the URL of the player's page.

Reviewing will take some time, Tenhou format logs will be saved in `logs/` folder, the review result will be saved in `rating.html` and opened in your default browser.
