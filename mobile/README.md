# Dad Arcade for iPhone and iPad

A universal SwiftUI app with a native library, search, favorites, recently played games, live web games, and bundled offline copies. Requires iOS/iPadOS 17 or later. No third-party native packages are needed.

## Open and run

Open `mobile/DadArcade.xcodeproj` in Xcode. Choose the DadArcade scheme and an iPhone or iPad simulator, then Run. The build automatically prepares offline resources from the website source with `mobile/scripts/prepare.py`.

For a physical device, select your developer team in Signing & Capabilities. The proposed bundle identifier is `com.dadarcade.app`. Change it consistently in the project and domain-association script if it is already registered under another team.

## How games flow into the app

The app fetches `https://dadarcade.com/games` at launch, when returning to the foreground, and on pull to refresh. It reads the existing `application/ld+json` ItemList; there is no second live catalog to maintain. It caches the last valid list and includes a launch snapshot.

To release a new game in the app:

1. Build and test its touch controls on iPhone and iPad. Keep the normal website entry and visible card in sync.
2. In its existing JSON-LD item in `games/index.html`, add `"operatingSystem": "iOS, iPadOS, Web"` and `"contentRating": "4+"` only after verifying those claims.
3. Publish the website normally. The app discovers it on its next refresh. Live-game fixes use the same website deployment flow.

The initial catalog includes Mahjong Garden, American Mah Jongg, and Balloon Uncle Bop. Other website entries stay outside the app until tested and marked ready. This release only accepts `4+` games; a higher-rated game needs an appropriate age-gating/rating change first. New games must stay within the disclosed privacy and functionality scope. Apple still reviews the app and may require changes; live delivery is not a way to bypass App Review.

## Live and offline play

Live versions use the current website and its existing online leaderboards. The player blocks known Google Analytics endpoints, restricts top-level navigation to approved catalog games, and exposes no native JavaScript bridge or camera/microphone permissions. External links go through a grown-up screen.

The three launch games include offline copies. Rebuilding the app refreshes those copies; website deployments alone do **not** update the bundled copies. Their scores/progress are separate from the live games. The offline build strips analytics and remote fonts, blocks all network connections through its content policy, and replaces leaderboard requests with device-local scores. It excludes all `face-*.png` family photos.

Balloon Uncle Bop uses `?edition=public` in the app: illustrated characters and no password. The existing website URL retains the family edition and its gate. The public edition is also directly accessible on the web using that query parameter.

## Validation

```sh
python3 mobile/scripts/prepare.py
node --test mobile/tests/offline.test.mjs
swiftc -module-cache-path /tmp/dadarcade-swift-cache mobile/DadArcade/Game.swift mobile/tests/CatalogTests.swift -o /tmp/dadarcade-catalog-tests
/tmp/dadarcade-catalog-tests "$PWD"
xcodebuild -project mobile/DadArcade.xcodeproj -scheme DadArcade -configuration Debug -sdk iphonesimulator -derivedDataPath mobile/build CODE_SIGNING_ALLOWED=NO build
```

The tests check automatic discovery of a future game, URL/device/rating restrictions, public-edition routing, offline score persistence, malformed submissions, missing game boot code, and exclusion of analytics/photos. Verify actual gameplay in the simulator and on hardware too.

## Signing, universal links, and submission

1. The project is configured for the supplied Apple developer team `8H27HFXBQA`. Sign in to that team in Xcode; no credentials are stored in this repository.
2. Run `python3 mobile/scripts/associate-domain.py YOUR_TEAM_ID`, commit the generated `.well-known/apple-app-site-association`, and deploy it. If your account uses a legacy App ID prefix different from its Team ID, use the prefix shown in the signed app's application identifier instead. Check the generated identifier against the signed entitlements.
3. Confirm the association URL returns JSON without redirects, and test a shared `/play/<game>` link on a physical device. The app declares `applinks:dadarcade.com`, handles those links, and generates them from its native Share action. Website redirects provide a fallback when the app is not installed; unrelated website/support pages remain in the browser.
4. The [App Store Connect record](https://appstoreconnect.apple.com/apps/6824207156/distribution) exists for `com.dadarcade.app` (Apple ID `6824207156`). Review the progress and draft in `APP-STORE.md`, complete the actual age-rating questionnaire and privacy declarations, and supply support/contact details.
5. Select a physical-device destination, Product → Archive, then Distribute App → App Store Connect. Test through TestFlight before submitting the build for public review.

Privacy/support URL: `https://dadarcade.com/app/privacy`. Review the disclosures against the deployed games before each release. Simulator builds are not installable on physical devices, and an unsigned build cannot be uploaded to App Store Connect.

The Xcode project generator (`scripts/create-project.py`) and icon renderer (`scripts/draw-icon.swift`) are included for reproducibility. Normal builds do not need to run them.
