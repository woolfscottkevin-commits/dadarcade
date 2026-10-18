# App Store submission draft

The app record and draft listing are saved in [App Store Connect](https://appstoreconnect.apple.com/apps/6824207156/distribution). Nothing has been submitted for public review or approved.

## Release progress — October 18, 2026

- Apple ID: `6824207156`; SKU: `dadarcade-ios`.
- Created with Full Access after Kevin explicitly approved that setting.
- Saved the description, keywords, support/marketing links, subtitle, Games category, no-login review setting, and review notes. Added the published privacy-policy URL; the data-collection questionnaire remains to be completed.
- Uploaded version `1.0`, build `1`, successfully using the signed archive. Apple accepted the upload for processing; TestFlight availability and tester assignment must be verified after processing finishes.
- No tester invitations have been sent, and no public-review submission has been made.

**Name:** Dad Arcade
**Subtitle:** A little play. A lot of joy.
**Primary category:** Games
**Price:** Free
**Bundle ID:** com.dadarcade.app
**Platforms:** iPhone and iPad, iOS/iPadOS 17+
**Privacy URL:** https://dadarcade.com/app/privacy
**Support URL:** https://dadarcade.com/app/privacy

## Description

Welcome to Dad Arcade: a growing collection of games made for a little everyday fun.

Find a quiet moment in Mahjong Garden, play American Mah Jongg against three computer opponents, or puff, solve, and pop your way through Balloon Uncle Bop with its cheerful illustrated characters.

- A native game library for iPhone and iPad
- Favorites and recently played games
- New touch-ready games delivered through the live arcade catalog
- Included offline copies of the three launch games
- No ads, subscriptions, or account required

Live games need an internet connection and may offer optional public leaderboards. Offline copies save progress and scores separately on your device.

## Review notes

This is a native SwiftUI game library that offers first-party HTML/JavaScript mini games under App Review Guideline 4.7. The live index is the structured ItemList at https://dadarcade.com/games. Its iPhone/iPad entries are visible in the app and link to the individual games. New content must meet the app's disclosed age/privacy requirements.

The current games are Mahjong Garden, American Mah Jongg, and Balloon Uncle Bop. There is no app login. Balloon Uncle Bop opens the public illustrated edition at https://dadarcade.com/balloon-uncle-bop?edition=public; it does not require the family website password. American Mah Jongg uses an original card of hands and computer opponents.

Native functionality includes favorites, recently played history, search, universal game links once the signed domain association is deployed, and offline game copies. Choose a game, then Play latest version or Play offline copy. Return with the Arcade control; unsaved progress may be lost. Use About & privacy or the game menu to report issues/content concerns.

No native platform APIs are exposed to downloaded game JavaScript. Camera and microphone requests are denied. Website analytics are blocked in the native game player; bundled offline copies cannot connect to the network. External links require a grown-up confirmation screen.

## Before public submission

- Team `8H27HFXBQA` is configured. A signed Release archive and App Store distribution package were verified and uploaded to the app record for `com.dadarcade.app`.
- The universal-link association is published and returns JSON successfully. Test shared game links on a physical device before claiming the device association works.
- Complete Apple's age questionnaire accurately for all offered games. The catalog currently admits only entries explicitly rated 4+; this marker is not a substitute for Apple's questionnaire.
- Review Guideline 4.7 requirements for the final live catalog, including its index, universal links, privacy, age handling, and content reporting. There are no user accounts, chat, or user-published games in the launch catalog.
- Review the final category choice. “Kids Category” is a separate decision with stricter rules, not implied by a 4+ rating.
- Complete App Privacy disclosures: optional public initials/scores, timestamps, and connection/IP information used by website hosting and score-abuse protection. No tracking is intended. The manifest includes UserDefaults reason CA92.1 and content/other-data categories for the live service; confirm the classifications in App Store Connect.
- Add the developer's legal/support contact and copyright owner, accept any required agreements personally, and review third-party/asset rights.
- Capture final screenshots from the signed release on the required iPhone and iPad sizes. The local simulator captures are development previews.
- Use TestFlight to test both live/offline modes, airplane mode, audio, orientation, larger text, background/resume, and the public balloon edition on physical devices before public submission.
