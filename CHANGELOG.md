# Changelog

## [1.1.3](https://github.com/vincedelmas/BTunes/compare/v1.1.2...v1.1.3) (2026-11-11)


### Bug Fixes

* avoid incompatible native D-Bus sockets ([aa2b833](https://github.com/vincedelmas/BTunes/commit/aa2b83347cb2af8258419761b692ee0ec1447c4a))

## [1.1.2](https://github.com/vincedelmas/BTunes/compare/v1.1.1...v1.1.2) (2026-11-11)


### Bug Fixes

* isolate D-Bus session for Electron CI tests ([1eea9f1](https://github.com/vincedelmas/BTunes/commit/1eea9f197296f456964de9d438c99964cde2a420))

## [1.1.1](https://github.com/vincedelmas/BTunes/compare/v1.1.0...v1.1.1) (2026-11-11)


### Bug Fixes

* remember shuffle and repeat preferences ([31e0fe2](https://github.com/vincedelmas/BTunes/commit/31e0fe2376fa6cbba003e9494a4550d6a92803cf))
* sync player volume with Linux media controls ([ddeffad](https://github.com/vincedelmas/BTunes/commit/ddeffadfdf8f85e4124a2edc067e4bb7c9dab81b))

## [1.1.0](https://github.com/vincedelmas/BTunes/compare/v1.0.1...v1.1.0) (2026-11-11)


### Features

* add pinned playlists and automatic library mixes ([4e7aceb](https://github.com/vincedelmas/BTunes/commit/4e7acebfd7c2456cd982683892cc4b44c0aea87c))
* add queue editing and predictable shuffle playback ([4f7afca](https://github.com/vincedelmas/BTunes/commit/4f7afca5d057f296fbbcf17d356945d5af9aed0e))
* redesign music headers and contextual search ([64a9b60](https://github.com/vincedelmas/BTunes/commit/64a9b60dd1422d1a886bf83fa0ada68c6d9dfc21))
* refine library layouts and playback visuals ([9185d71](https://github.com/vincedelmas/BTunes/commit/9185d71648cf69fa556965c052d08f06e506087c))


### Bug Fixes

* always reveal songs after manual track skips ([1502db8](https://github.com/vincedelmas/BTunes/commit/1502db8c25d57e856ebb20ef9449faea03b3d6a6))
* avoid Vulkan probing on Wayland ([f1321a0](https://github.com/vincedelmas/BTunes/commit/f1321a0f5929bd72205e583d77b8f7c561327a8c))
* enable Linux desktop media controls ([ca73ebf](https://github.com/vincedelmas/BTunes/commit/ca73ebf2ed483b2794f2bc43e90ee966e74d1057))
* enlarge header visualizer and dismiss empty search ([df0ed4f](https://github.com/vincedelmas/BTunes/commit/df0ed4f2529b75bb00ebeb468861b42a1db0fa17))
* remove some eyebrows and descriptions ([401b548](https://github.com/vincedelmas/BTunes/commit/401b548cf2e8462ae788cff25ed4deb7c7b4cb3a))
* remove stale mix details and preserve MTP field order ([34eca23](https://github.com/vincedelmas/BTunes/commit/34eca2380b0eaaddc4911ceedb3656445c736b8d))

## [1.0.1](https://github.com/vincedelmas/BTunes/compare/v1.0.0...v1.0.1) (2026-11-06)


### Bug Fixes

* exclude build-only dependencies from AppImage ([0dfd9a6](https://github.com/vincedelmas/BTunes/commit/0dfd9a6a17bcca55e5052fa198fedcbc65e73ec7))

## 1.0.0 (2026-11-06)


### Features

* add AppImage releases and in-app updates ([1b88c2d](https://github.com/vincedelmas/BTunes/commit/1b88c2d73819025111e48545e7b1c56300b2523e))
* add back navigation and artist song dialogs ([303d449](https://github.com/vincedelmas/BTunes/commit/303d449451e5724d9dfff951d8f58075c116216e))
* add cover search and album artist support ([a606081](https://github.com/vincedelmas/BTunes/commit/a6060815d1335a885dca1b1d9ccb081f349f4b73))
* add genre suggestions and now-playing navigation ([49f4888](https://github.com/vincedelmas/BTunes/commit/49f48885422cb1c79d52fcd41ccf3b0bc942fcf9))
* add persistent layouts and branded startup ([4966a0b](https://github.com/vincedelmas/BTunes/commit/4966a0bceda822452bcac08fc6d52e786b849a85))
* add table controls and playlist management ([6dbdfd4](https://github.com/vincedelmas/BTunes/commit/6dbdfd4b57a0c22435ca71533ac6a6473c05efcd))
* add USB sync, drop imports, and repeat-one playback ([7e11449](https://github.com/vincedelmas/BTunes/commit/7e1144936fc9a66c1ffe3316c0ff411e21ed5ded))
* bootstrap Sillage local music library and player ([b270918](https://github.com/vincedelmas/BTunes/commit/b2709183244b45f7a23dc49922df41edda5a43a5))
* improve album browsing and artwork selection ([3802b91](https://github.com/vincedelmas/BTunes/commit/3802b910fdc67260e49403fa56e7e55231a90b91))
* integrate bookmark downloads with metadata review ([f6c6b3d](https://github.com/vincedelmas/BTunes/commit/f6c6b3d930f7e2fe817412ee7338f9e504822ca9))
* refine table controls and floating tag editing ([abdc8c4](https://github.com/vincedelmas/BTunes/commit/abdc8c42ce6f61f483499d4e087714db321b1d99))


### Bug Fixes

* correct sync matching and import and playback edge cases ([9926910](https://github.com/vincedelmas/BTunes/commit/9926910d2624694e9afeb8899e13e1753c8a0374))
* handle development startup reloads ([7f5dedf](https://github.com/vincedelmas/BTunes/commit/7f5dedf7df9e9dcf3b8a9077365552118c782d9f))
* harden library lifecycle and RPC contracts ([06ee911](https://github.com/vincedelmas/BTunes/commit/06ee9114b2cd278a3af0e7af6627f0751df3702c))
* improve library navigation and repair missing durations ([1fc5cb1](https://github.com/vincedelmas/BTunes/commit/1fc5cb1c44bfb6da9415fdafbb87206e7136c703))
* prevent device cards shrinking and enable scrolling ([8757d24](https://github.com/vincedelmas/BTunes/commit/8757d24c34842b0c9ea2768488d998138d445430))
* prevent download row status overlap ([6ab1d9b](https://github.com/vincedelmas/BTunes/commit/6ab1d9be38f7f2f8e8e5f896afba6208f4bb047f))
* refine playback controls and artist browsing ([a4149d6](https://github.com/vincedelmas/BTunes/commit/a4149d60ef11312da0dd99901d57cad92eb00ef9))
* simplify songs view and fill table width ([1ca16c4](https://github.com/vincedelmas/BTunes/commit/1ca16c4edfdf781e0715c088274c8d671c8ab9e1))


### Performance Improvements

* enable React Compiler and simplify memoization ([cbf3dc5](https://github.com/vincedelmas/BTunes/commit/cbf3dc501f5b9bf4174952a8536a57a7548f2651))
* replace class merging helper with shadcn cn ([230f9cc](https://github.com/vincedelmas/BTunes/commit/230f9ccc9b32cb4d69bed4847b3af5589d8441b0))
* speed up cover search and cache previews ([56109f5](https://github.com/vincedelmas/BTunes/commit/56109f50caf86652a993a6e912ab9856f2248872))


### Code Refactoring

* clean renderer flows and collection selection ([e66b2c5](https://github.com/vincedelmas/BTunes/commit/e66b2c5b0bda236e7f1a2bd6d99f4fe080e3f625))
* clean up collection logic and UI styles ([aeb2379](https://github.com/vincedelmas/BTunes/commit/aeb2379953cac4964c5cd065f5630667f053dcf8))
* consolidate error handling and simplify renderer flows ([c150035](https://github.com/vincedelmas/BTunes/commit/c150035de6a0b175c022b2a40ffadce9917f36a9))
* simplify component styling and artwork loading ([46ce03e](https://github.com/vincedelmas/BTunes/commit/46ce03e714a10d2672784439edca9acecf4600ce))
