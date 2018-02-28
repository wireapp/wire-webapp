/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

'use=szigorú';

z.string.hu.wire = 'Wire';
z.string.hu.wireMacos = 'Wire MacOS-hez';
z.string.hu.wireWindows = 'Wire Windowshoz';
z.string.hu.wireLinux = 'Wire Linuxhoz';
z.string.hu.nonexistentUser = 'Törölt felhasználó';
z.string.hu.and = 'és';
z.string.hu.enumerationAnd = 'és ';

//=Alkalmazás betöltése
z.string.hu.alertUploadFileFormat = 'Ezt a képet nem használhatod.\nPNG vagy JPEG fájlt válassz.';
z.string.hu.alertUploadTooSmall = 'Ezt a képet nem használhatod.\nVálassz egy képet, ami legalább 320 x 320 px méretű.';
z.string.hu.alertUploadTooLarge = 'A kép mérete túl nagy.\nMaximum {{number}} MB méretű fájlt tudsz feltölteni.';
z.string.hu.alertGifTooLarge = 'Az Animáció mérete túl nagy.\nA maximális méret {{number}} MB.';

z.string.hu.authAccountCountryCode = 'Országhívó-kód';
z.string.hu.authAccountDeletion = 'Ki lettél jelentkeztetve, mert a felhasználói fiókodat törölték.';
z.string.hu.authAccountExpiration = 'A munkamenet lejárt, ezért ki lettél jelentkeztetve. Kérjük, jelentkezz be újra.';
z.string.hu.authAccountPasswordForgot = 'Elfelejtett jelszó';
z.string.hu.authAccountPublicComputer = 'Ez egy nyilvános számítógép';
z.string.hu.authAccountSignIn = 'Bejelentkezés';
z.string.hu.authAccountSignInEmail = 'E-mail';
z.string.hu.authAccountSignInPhone = 'Telefon';

z.string.hu.authBlockedCookies = 'A bejelentkezéshez engedélyezni kell a böngésző-sütiket.';
z.string.hu.authBlockedDatabase = 'Az üzenetek megjelenítéséhez a Wire-nek el kell érnie a helyi tárhelyet. A böngésző privát módú használatakor a helyi tárhely nem áll rendelkezésre.';
z.string.hu.authBlockedTabs = 'A Wire már nyitva van egy másik böngészőlapon.';

z.string.hu.authVerifyAccountAdd = 'Hozzáadás';
z.string.hu.authVerifyAccountDetail = 'Ezáltal akár több eszközön is használhatod a Wire-t.';
z.string.hu.authVerifyAccountHeadline = 'E-mail cím és jelszó megadása.';
z.string.hu.authVerifyAccountLogout = 'Kijelentkezés';
z.string.hu.authVerifyCodeDescription = 'Írd be az ellenőrző kódot,\namit a {{number}} telefonszámra küldtünk.';
z.string.hu.authVerifyCodeResend = 'Nem kaptál kódot?';
z.string.hu.authVerifyCodeResendDetail = 'Újraküldés';
z.string.hu.authVerifyCodeResendTimer = 'Új kódot kérhetsz {{expiration}} múlva.';
z.string.hu.authVerifyCodeChangePhone = 'Telefonszám módosítása';
z.string.hu.authVerifyPasswordHeadline = 'Add meg a jelszavad';

z.string.hu.authLimitDevicesHeadline = 'Eszközök';
z.string.hu.authLimitDescription = 'Ahhoz, hogy használni tudd a Wire-t ezen az eszközön, először távolítsd el azt valamelyik másikról.';
z.string.hu.authLimitButtonManage = 'Eszközök kezelése';
z.string.hu.authLimitButtonSignOut = 'Kijelentkezés';
z.string.hu.authLimitDevicesCurrent = '(Ez az eszköz)';

z.string.hu.authHistoryHeadline = 'Első alkalommal használod a Wire-t ezen az eszközön.';
z.string.hu.authHistoryDescription = 'Adatvédelmi okokból a beszélgetés előzményei nem jelennek meg.';
z.string.hu.authHistoryReuseHeadline = 'Már használtad a Wire-t ezen az eszközön.';
z.string.hu.authHistoryReuseDescription = 'Az előző használat óta elküldött üzenetek ezen az eszközön nem fognak megjelenni.';
z.string.hu.authHistoryButton = 'OK';

z.string.hu.authPostedResend = 'Újraküldés ide: {{email}}';
z.string.hu.authPostedResendAction = 'Nem kaptál e-mailt?';
z.string.hu.authPostedResendDetail = 'Ellenőrizd bejövő e-mailjeidet és kövesd az utasításokat.';
z.string.hu.authPostedResendHeadline = 'Leveled érkezett.';

z.string.hu.authPlaceholderEmail = 'E-mail';
z.string.hu.authPlaceholderPasswordPut = 'Jelszó';
z.string.hu.authPlaceholderPasswordSet = 'Jelszó (legalább 8 karakter)';
z.string.hu.authPlaceholderPhone = 'Telefonszám';

z.string.hu.authErrorCode = 'Érvénytelen kód';
z.string.hu.authErrorCountryCodeInvalid = 'Érvénytelen az Országhívó-kód';
z.string.hu.authErrorEmailExists = 'Ez az e-mail cím már foglalt';
z.string.hu.authErrorEmailForbidden = 'Sajnáljuk. Ez az e-mail cím nem megengedett.';
z.string.hu.authErrorEmailMalformed = 'Kérjük, valós e-mail címet adj meg.';
z.string.hu.authErrorEmailMissing = 'Kérjük, add meg az e-mail címed.';
z.string.hu.authErrorMisc = 'Csatlakozási probléma. Kérjük, próbáld meg újra.';
z.string.hu.authErrorNameShort = 'Legalább 2 karakterből álló nevet adj meg';
z.string.hu.authErrorOffline = 'Nincs internetkapcsolat';
z.string.hu.authErrorPasswordShort = 'Válassz egy legalább 8 karakter hosszú jelszót.';
z.string.hu.authErrorPasswordWrong = 'Hibás jelszó. Kérjük, próbáld meg újra.';
z.string.hu.authErrorPending = 'A fiók még nincs ellenőrizve';
z.string.hu.authErrorPhoneNumberBudget = 'Túl gyakran jelentkeztél be. Próbáld meg később.';
z.string.hu.authErrorPhoneNumberForbidden = 'Sajnáljuk. Ez a telefonszám nem megengedett.';
z.string.hu.authErrorPhoneNumberInvalid = 'Érvénytelen telefonszám';
z.string.hu.authErrorPhoneNumberUnknown = 'Ismeretlen telefonszám';
z.string.hu.authErrorSuspended = 'Ezzel az azonosítóval már nem lehet bejelentkezni.';
z.string.hu.authErrorSignIn = 'Kérjük, ellenőrizd az adataid, majd próbáld meg újra.';

z.string.hu.callStateOutgoing = 'Kicsengés…';
z.string.hu.callStateConnecting = 'Csatlakozás…';
z.string.hu.callStateIncoming = 'Hívás…';
z.string.hu.callDecline = 'Elutasítás';
z.string.hu.callAccept = 'Elfogadás';
z.string.hu.callJoin = 'Csatlakozás';
z.string.hu.callChooseSharedScreen = 'Válaszd ki a megosztandó képernyőt';
z.string.hu.callParticipants = '{{number}} partner a vonalban';

z.string.hu.modalButtonCancel = 'Mégsem';
z.string.hu.modalButtonOk = 'Ok';
z.string.hu.modalButtonSend = 'Küldés';

z.string.hu.modalBlockConversationHeadline = '{{user}} tiltása?';
z.string.hu.modalBlockConversationMessage = '{{user}} nem tud majd kapcsolatba lépni veled, sem meghívni téged csoportos beszélgetésekbe.';
z.string.hu.modalBlockConversationButton = 'Tiltás';
z.string.hu.modalBotsConfirmHeadline = 'Új szolgáltatás';
z.string.hu.modalBotsConfirmMessage = 'Biztos, hogy új beszélgetést szeretnél kezdeni {{name}} felhasználóval?';
z.string.hu.modalBotsConfirmButton = 'Megerősítés';
z.string.hu.modalBotsUnavailableHeadline = 'A botok jelenleg nem elérhetőek';
z.string.hu.modalBotsUnavailableMessage = 'Köszönjük, hogy érdeklődsz a botokkal kapcsolatban. A szolgáltatást jelenleg felfüggesztettük, amíg a következő verzión dolgozunk. Hamarosan jelentkezünk.';
z.string.hu.modalCallConversationEmptyHeadline = 'Senki sem hívható';
z.string.hu.modalCallConversationEmptyMessage = 'Senki sem maradt itt.';
z.string.hu.modalCallNoVideoInGroupHeadline = 'A csoportokban a videóhívás nem elérhető';
z.string.hu.modalCallNoVideoInGroupMessage = 'Videohívások nem érhetők el a csoportos beszélgetésben.';
z.string.hu.modalCallSecondIncomingHeadline = 'Fogadod a hívást?';
z.string.hu.modalCallSecondIncomingMessage = 'A folyamatban lévő hívás véget ért.';
z.string.hu.modalCallSecondIncomingAction = 'Fogadás';
z.string.hu.modalCallSecondOngoingHeadline = 'Bontsuk a hívást a másik eszközön?';
z.string.hu.modalCallSecondOngoingMessage = 'Egyszerre csak egy hívásban vehetsz részt.';
z.string.hu.modalCallSecondOngoingAction = 'Hívás befejezése';
z.string.hu.modalCallSecondOutgoingHeadline = 'Leteszed a folyamatban lévő hívást?';
z.string.hu.modalCallSecondOutgoingMessage = 'Egyszerre csak egy hívásban vehetsz részt.';
z.string.hu.modalCallSecondOutgoingAction = 'Hívás befejezése';
z.string.hu.modalClearConversationHeadline = 'Törlöd a tartalmat?';
z.string.hu.modalClearConversationOption = 'Kilépés a beszélgetésből is';
z.string.hu.modalClearConversationButton = 'Törlés';
z.string.hu.modalConnectedDeviceHeadline = 'Fiókod legutóbbi használata:';
z.string.hu.modalConnectedDeviceFrom = 'Eszköz:';
z.string.hu.modalConnectedDeviceMessage = 'Ha ezt nem te voltál, akkor töröld az eszközt, és állítsd alaphelyzetbe jelszavad.';
z.string.hu.modalConnectedDeviceManageDevices = 'eszközök kezelése';
z.string.hu.modalDeleteAccountAction = 'Törlés';
z.string.hu.modalDeleteAccountHeadline = 'Fiók törlése';
z.string.hu.modalDeleteAccountMessage = 'Küldünk egy e-mailt vagy SMS-t. Fiókod végleges törléséhez nyisd meg a kapott linket.';
z.string.hu.modalDeleteButton = 'Törlés';
z.string.hu.modalDeleteHeadline = 'Törlés csak nálam?';
z.string.hu.modalDeleteMessage = 'Ezt a műveletet nem lehet visszavonni.';
z.string.hu.modalDeleteEveryoneButton = 'Törlés';
z.string.hu.modalDeleteEveryoneHeadline = 'Törlés minden résztvevőnél?';
z.string.hu.modalDeleteEveryoneMessage = 'Ezt a műveletet nem lehet visszavonni.';
z.string.hu.modalTooLongHeadline = 'Az üzenet túl hosszú';
z.string.hu.modalTooLongMessage = 'Maximum {{number}} karakter hosszú üzenetet küldhetsz.';
z.string.hu.modalLeaveConversationHeadline = 'Kilépsz ebből a beszélgetésből: "{{name}}"?';
z.string.hu.modalLeaveConversationMessage = 'A résztvevők értesítést fognak kapni és a beszélgetést eltávolítjuk a listádból.';
z.string.hu.modalLeaveConversationButton = 'Kilépés';
z.string.hu.modalLogoutHeadline = 'Adatok törlése?';
z.string.hu.modalLogoutMessage = 'Ez törli az összes személyes adatodat és beszélgetéseidet erről az eszközről.';
z.string.hu.modalLogoutButton = 'Kijelentkezés';
z.string.hu.modalNewDeviceHeadline = '{{user}} elkezdett használni egy új eszközt';
z.string.hu.modalNewDeviceHeadlineMany = '{{users}} elkezdtek új eszközöket használni';
z.string.hu.modalNewDeviceHeadlineYou = '{{user}} elkezdett használni egy új eszközt';
z.string.hu.modalNewDeviceMessage = 'Biztos, hogy még mindig el szeretnéd küldeni az üzeneteidet?';
z.string.hu.modalNewDeviceCallAccept = 'Hívás fogadása';
z.string.hu.modalNewDeviceCallAnyway = 'Hívás mindenképpen';
z.string.hu.modalNewDeviceCallIncoming = 'Biztos, hogy még mindig fogadni szeretnéd a hívást?';
z.string.hu.modalNewDeviceCallOutgoing = 'Biztos, hogy még mindig kezdeményezni szeretnéd a hívást?';
z.string.hu.modalNewDeviceShowDevice = 'eszköz mutatása';
z.string.hu.modalNewDeviceSendAnyway = 'küldés mindenképpen';
z.string.hu.modalNotConnectedHeadline = 'Senki nem lett hozzáadva a beszélgetéshez';
z.string.hu.modalNotConnectedMessageOne = '{{name}} nem szeretne csatlakozni a beszélgetéshez.';
z.string.hu.modalNotConnectedMessageMany = 'Az egyik kiválasztott partner nem szeretne csatlakozni a beszélgetéshez.';
z.string.hu.modalRemoveDeviceButton = 'Eszköz eltávolítása';
z.string.hu.modalRemoveDeviceHeadline = '"{{device}}" eltávolítása';
z.string.hu.modalRemoveDeviceMessage = 'Az eszköz eltávolításához add meg a jelszavad.';
z.string.hu.modalServiceUnavailableHeadline = 'Új szolgáltatás hozzáadása nem lehetséges';
z.string.hu.modalServiceUnavailableMessage = 'A szolgáltatás jelenleg nem elérhető.';
z.string.hu.modalSessionResetHeadline = 'A munkamenet alaphelyzetbe állítva';
z.string.hu.modalSessionResetMessage1 = 'Ha a probléma továbbra is fennáll,';
z.string.hu.modalSessionResetMessageLink = 'lépj kapcsolatba';
z.string.hu.modalSessionResetMessage2 = 'velünk.';
z.string.hu.modalTooManyMembersHeadline = 'Telt ház';
z.string.hu.modalTooManyMembersMessage = 'Legfeljebb {{number1}} partner tud csatlakozni a beszélgetéshez. Még {{number2}} partner számára van hely.';
z.string.hu.modalUploadsParallel = 'Egyszerre {{number}} fájt küldhetsz.';

z.string.hu.connectionRequestConnect = 'Csatlakozás';
z.string.hu.connectionRequestIgnore = 'Figyelmen kívül hagyás';

z.string.hu.conversationGuestIndicator = 'Vendég';

z.string.hu.conversationYouNominative = 'te';
z.string.hu.conversationYouDative = 'te';
z.string.hu.conversationYouAccusative = 'te';

z.string.hu.conversationBotUser = 'Bot';
z.string.hu.conversationConnectionAccepted = 'Csatlakozva';
z.string.hu.conversationConnectionBlocked = 'Letiltva';
z.string.hu.conversationConnectionCancelRequest = 'Csatlakozási kérés visszavonása';
z.string.hu.conversationCreate = ' beszélgetést kezdett a következőkkel: {{users}}';
z.string.hu.conversationCreateName = '{{user}} beszélgetést indított';
z.string.hu.conversationCreateNameYou = '{{user}} beszélgetést indított';
z.string.hu.conversationCreateWith = ' velük: {{users}}';
z.string.hu.conversationCreateYou = ' beszélgetést kezdett a következőkkel: {{users}}';
z.string.hu.conversationDeviceStartedUsingOne = ' elkezdett használni';
z.string.hu.conversationDeviceStartedUsingMany = ' elkezdett használni';
z.string.hu.conversationDeviceUnverified = ' visszavontad az ellenőrzött státuszt';
z.string.hu.conversationDeviceYourDevices = ' az egyik eszközödről';
z.string.hu.conversationDeviceUserDevices = ' {{user}} egyik eszköze';
z.string.hu.conversationDeviceNewDeviceOne = ' egy új eszközt';
z.string.hu.conversationDeviceNewDeviceMany = ' új eszközöket';
z.string.hu.conversationDeviceNewPeopleJoined = 'új partnerek csatlakoztak.';
z.string.hu.conversationDeviceNewPeopleJoinedVerify = ' eszközök ellenőrzése';
z.string.hu.conversationJustNow = 'Épp most';
z.string.hu.conversationLocationLink = 'Térkép megnyitása';
z.string.hu.conversationMemberJoin = ' hozzáadta a következőket: {{users}}';
z.string.hu.conversationMemberJoinYou = ' hozzáadta a következőket: {{users}}';
z.string.hu.conversationMemberLeaveLeft = ' kilépett';
z.string.hu.conversationMemberLeaveLeftYou = ' kilépett';
z.string.hu.conversationMemberLeaveRemoved = ' eltávolította a következőket: {{users}}';
z.string.hu.conversationMemberLeaveRemovedYou = ' eltávolította a következőket: {{users}}';
z.string.hu.conversationMessageDelivered = 'Kézbesítve';
z.string.hu.conversationRename = ' átnevezte a beszélgetést';
z.string.hu.conversationRenameYou = ' átnevezte a beszélgetést';
z.string.hu.conversationResume = 'Beszélgetés indítása a következőkkel: {{users}}';
z.string.hu.conversationTeamLeave = ' el lett távolítva a csapatból';
z.string.hu.conversationPing = ' kopogott';
z.string.hu.conversationPingYou = ' kopogott';
z.string.hu.conversationToday = 'ma';
z.string.hu.conversationVerified = 'Ellenőrizve';
z.string.hu.conversationVoiceChannelDeactivate = ' hívást kezdeményezett';
z.string.hu.conversationVoiceChannelDeactivateYou = ' hívást kezdeményezett';
z.string.hu.conversationYesterday = 'Tegnap';
z.string.hu.conversationUnableToDecrypt1 = 'egy üzenetet nem kaptál meg tőle: {{user}}.';
z.string.hu.conversationUnableToDecrypt2 = '{{user}} eszközének azonosítója megváltozott. Kézbesítetlen üzenet.';
z.string.hu.conversationUnableToDecryptLink = 'Miért?';
z.string.hu.conversationUnableToDecryptErrorMessage = 'Hiba';
z.string.hu.conversationUnableToDecryptResetSession = 'Munkamenet visszaállítása';
z.string.hu.conversationMissedMessages = 'Ezt a készüléket már nem használtad egy ideje, ezért nem biztos, hogy minden üzenet megjelenik itt.';
z.string.hu.conversationAssetDownloading = 'Letöltés…';
z.string.hu.conversationAssetUploadFailed = 'A feltöltés sikertelen';
z.string.hu.conversationAssetUploadTooLarge = 'Maximum {{number}} méretű fájlokat küldhetsz';
z.string.hu.conversationPlaybackError = 'Nem lehet lejátszani';
z.string.hu.conversationContextMenuEdit = 'Szerkesztés';
z.string.hu.conversationContextMenuDelete = 'Törlés nálam';
z.string.hu.conversationContextMenuDeleteEveryone = 'Törlés mindenkinél';
z.string.hu.conversationContextMenuDownload = 'Letöltés';
z.string.hu.conversationContextMenuLike = 'Tetszik';
z.string.hu.conversationContextMenuUnlike = 'Nem tetszik';
z.string.hu.conversationDeleteTimestamp = 'Törölve: {{date}}';
z.string.hu.conversationEditTimestamp = 'Módosítva: {{date}}';
z.string.hu.conversationLikesCaption = '{{number}} partner';
z.string.hu.conversationSendPastedFile = 'Kép beillesztve ({{date}})';
z.string.hu.conversationSomeone = 'Valaki';
z.string.hu.conversationTweetAuthor = ' Twitteren';

z.string.hu.groupCreationPreferencesAction = 'Tovább';
z.string.hu.groupCreationPreferencesErrorNameShort = 'Legalább 1 karakter';
z.string.hu.groupCreationPreferencesErrorNameLong = 'Túl sok karakter';
z.string.hu.groupCreationPreferencesHeader = 'Új csoport';
z.string.hu.groupCreationPreferencesPlaceholder = 'Csoportnév';
z.string.hu.groupCreationParticipantsActionCreate = 'Kész';
z.string.hu.groupCreationParticipantsActionSkip = 'Kihagyás';
z.string.hu.groupCreationParticipantsHeader = 'Partnerek hozzáadása';
z.string.hu.groupCreationParticipantsHeaderWithCounter = 'Partnerek hozzáadása ({{number}})';
z.string.hu.groupCreationParticipantsPlaceholder = 'Keresés név szerint';

z.string.hu.collectionShowAll = 'Mind a(z) {{number}} mutatása';
z.string.hu.collectionSectionLinks = 'Hivatkozások';
z.string.hu.collectionSectionImages = 'Képek';
z.string.hu.collectionSectionFiles = 'Fájlok';
z.string.hu.collectionSectionAudio = 'Hangüzenetek';

z.string.hu.fullsearchPlaceholder = 'Szöveges üzenetek keresése';
z.string.hu.fullsearchNoResults = 'Nincs találat.';

z.string.hu.archiveHeader = 'Archiválás';

z.string.hu.conversationsAllArchived = 'Minden archiválva';
z.string.hu.conversationsContacts = 'Névjegyek';
z.string.hu.conversationsConnectionRequestMany = '{{number}} partner várakozik';
z.string.hu.conversationsConnectionRequestOne = '1 partner várakozik';
z.string.hu.conversationsEmptyConversation = 'Csoportos beszélgetés';
z.string.hu.conversationsNoConversations = 'Indíts egy beszélgetést vagy hozz létre egy csoportot.';
z.string.hu.conversationsPopoverArchive = 'Archiválás';
z.string.hu.conversationsPopoverBlock = 'Tiltás';
z.string.hu.conversationsPopoverCancel = 'Kérelem visszavonása';
z.string.hu.conversationsPopoverClear = 'Törlés';
z.string.hu.conversationsPopoverLeave = 'Kilépés';
z.string.hu.conversationsPopoverNotify = 'Némítás feloldása';
z.string.hu.conversationsPopoverSilence = 'Némítás';
z.string.hu.conversationsPopoverUnarchive = 'Archiválás visszavonása';

z.string.hu.conversationsSecondaryLineMissedCall = '{{number}} nem fogadott hívás';
z.string.hu.conversationsSecondaryLineMissedCalls = '{{number}} nem fogadott hívás';
z.string.hu.conversationsSecondaryLineNewMessage = '{{number}} új üzenet';
z.string.hu.conversationsSecondaryLineNewMessages = '{{number}} új üzenet';
z.string.hu.conversationsSecondaryLinePing = '{{number}} kopogás';
z.string.hu.conversationsSecondaryLinePings = '{{number}} kopogás';
z.string.hu.conversationsSecondaryLinePeopleLeft = '{{number}} partner kilépett a beszélgetésből';
z.string.hu.conversationsSecondaryLinePersonLeft = '{{user}} kilépett';
z.string.hu.conversationsSecondaryLinePersonRemoved = '{{user}} eltávolítva';
z.string.hu.conversationsSecondaryLinePeopleAdded = '{{user}} hozzáadva';
z.string.hu.conversationsSecondaryLinePersonAdded = '{{user}} hozzáadva';
z.string.hu.conversationsSecondaryLinePersonAddedYou = '{{user}} hozzáadott téged';
z.string.hu.conversationsSecondaryLineRenamed = '{{user}} átnevezte a beszélgetést';
z.string.hu.conversationsSecondaryLineTimedMessage = 'Időzített üzenet';
z.string.hu.conversationsSecondaryLineYouLeft = 'Kiléptél';
z.string.hu.conversationsSecondaryLineYouWereRemoved = 'El lettél távolítva';

z.string.hu.takeoverSub = 'Foglald le egyedi Wire felhasználóneved.';
z.string.hu.takeoverLink = 'További információ';
z.string.hu.takeoverButtonChoose = 'Válaszd ki a sajátod';
z.string.hu.takeoverButtonKeep = 'Tartsd meg ezt';

z.string.hu.inviteMetaKeyMac = 'Cmd';
z.string.hu.inviteMetaKeyPc = 'Ctrl';
z.string.hu.inviteHeadline = 'Hívj meg másokat is a Wire-re';
z.string.hu.inviteMessage = 'Fent vagyok a Wire-ön. Keress rá a felhasználónevemre: {{username}} vagy nyisd meg a get.wire.com weboldalt.';
z.string.hu.inviteMessageNoEmail = 'Fent vagyok a Wire-ön. Látogass el a get.wire.com weboldalra és lépj kapcsolatba velem.';

z.string.hu.extensionsBubbleButtonGif = 'Gif';

z.string.hu.extensionsGiphyButtonOk = 'Küldés';
z.string.hu.extensionsGiphyButtonMore = 'Másik keresése';
z.string.hu.extensionsGiphyMessage = '{{tag}} • Forrás: giphy.com';
z.string.hu.extensionsGiphyNoGifs = 'Hoppá, nincs gif';
z.string.hu.extensionsGiphyRandom = 'Véletlenszerű';

z.string.hu.peopleConfirmLabel = 'Partnerek hozzáadása a csoporthoz';
z.string.hu.peoplePeople = '{{number}} Partner';
z.string.hu.peopleSearchPlaceholder = 'Keresés név szerint';
z.string.hu.peopleEveryoneParticipates = 'Az összes partnered, \nakivel felvetted a kapcsolatot,\nmár ebben a beszélgetésben van.';
z.string.hu.peopleNoMatches = 'Nincs találat. \nPróbálj megy egy másik nevet.';
z.string.hu.peopleInvite = 'Hívj meg másokat is a Wire-re';
z.string.hu.peopleInviteDetail = 'Névjegyeid megosztása megkönnyíti, hogy kapcsolatba lépj másokkal. Az összes információt anonimizáljuk és nem osztjuk meg senki mással.';
z.string.hu.peopleInviteButtonContacts = 'Névjegyekből';
z.string.hu.peopleInviteButtonGmail = 'Gmail-ből';
z.string.hu.peopleInviteHeadline = 'Hozd a barátaidat is';
z.string.hu.peopleServiceConfirmButton = 'Új szolgáltatás';
z.string.hu.peopleServiceRemovalButton = 'Szolgáltatás eltávolítása';
z.string.hu.peopleServiceNewConversation = 'Új beszélgetés létrehozása';
z.string.hu.peopleServices = 'Szolgáltatások';
z.string.hu.peopleShare = 'Névjegyek megosztása';
z.string.hu.peopleTabsDetails = 'Részletek';
z.string.hu.peopleTabsDevices = 'Eszközök';
z.string.hu.peopleTabsDevicesHeadline = 'A Wire-ben minden eszköz egyedi ujjlenyomattal rendelkezik. Hasonlítsd össze ezt az ujjlenyomatot {{user}} partnerrel és ellenőrizd a beszélgetést.';
z.string.hu.peopleTabsDevicesLearnMore = 'További információ';
z.string.hu.peopleTabsDevicesWhyVerify = 'Miért ellenőrizd a beszélgetést?';
z.string.hu.peopleTabsNoDevicesHeadline = '{{user}} a Wire régi verzióját használja. Eszközei itt nem jeleníthetőek meg.';
z.string.hu.peopleTabsDeviceDetailAllMyDevices = 'Összes saját eszköz mutatása';
z.string.hu.peopleTabsDeviceDetailDeviceFingerprint = 'Eszköz ujjlenyomata';
z.string.hu.peopleTabsDeviceDetailHeadline = 'Ellenőrizd, hogy ez egyezik-e {{html1}}{{user}} eszközén látható{{html2}} ujjlenyomattal.';
z.string.hu.peopleTabsDeviceDetailHowTo = 'Hogyan csináljam?';
z.string.hu.peopleTabsDeviceDetailResetSession = 'Munkamenet visszaállítása';
z.string.hu.peopleTabsDeviceDetailShowMyDevice = 'Eszköz ujjlenyomatának megjelenítése';
z.string.hu.peopleTabsDeviceDetailVerify = 'Ellenőrizve';
z.string.hu.peopleTabsPeople = 'Partner';
z.string.hu.peopleTabsServices = 'Szolgáltatások';
z.string.hu.peopleVerified = 'Ellenőrizve';

z.string.hu.peopleBlockHeadline = 'Letiltod?';
z.string.hu.peopleBlockMessage = '{{user}} nem tud majd kapcsolatba lépni veled, sem meghívni téged csoportos beszélgetésekbe.';

z.string.hu.peopleConnectHeadline = 'Elfogadod?';
z.string.hu.peopleConnectMessage = 'Ezzel csatlakozol és beszélgetést indítasz {{user}} partnerrel.';

z.string.hu.peopleCancelRequestHeadline = 'Kérelem visszavonása?';
z.string.hu.peopleCancelRequestMessage = 'Visszavonod a csatlakozási kérelmet {{user}} partnerhez.';

z.string.hu.peopleLeaveHeadline = 'Kilépsz ebből a beszélgetésből?';
z.string.hu.peopleLeaveMessage = 'Ezután nem fogsz tudni üzeneteket küldeni és fogadni ebben a beszélgetésben.';

z.string.hu.peopleRemoveHeadline = 'Törlöd?';
z.string.hu.peopleRemoveMessage = '{{user}} nem fog tudni üzenetet küldeni és fogadni ebben a beszélgetésben.';

z.string.hu.peopleUnblockHeadline = 'Feloldod a letiltást?';
z.string.hu.peopleUnblockMessage = '{{user}} újra kapcsolatba tud lépni veled és meg tud hívni téged csoportos beszélgetésekbe.';

z.string.hu.peopleButtonAdd = 'Hozzáadás';
z.string.hu.peopleButtonAddPeople = 'Partnerek hozzáadása';
z.string.hu.peopleButtonBlock = 'Tiltás';
z.string.hu.peopleButtonCancel = 'Mégsem';
z.string.hu.peopleButtonConnect = 'Csatlakozás';
z.string.hu.peopleButtonCreate = 'Csoport létrehozása';
z.string.hu.peopleButtonIgnore = 'Figyelmen kívül hagyás';
z.string.hu.peopleButtonLeave = 'Kilépés';
z.string.hu.peopleButtonOpen = 'Beszélgetés megnyitása';
z.string.hu.peopleButtonPending = 'Függőben lévő';
z.string.hu.peopleButtonProfile = 'Profil';
z.string.hu.peopleButtonRemove = 'Eltávolítás';
z.string.hu.peopleButtonUnblock = 'Tiltás feloldása';
z.string.hu.peopleButtonNo = 'Nem';
z.string.hu.peopleButtonYes = 'Igen';

z.string.hu.preferencesAbout = 'Névjegy';
z.string.hu.preferencesAccount = 'Fiók';
z.string.hu.preferencesAV = 'Hang / Videó';
z.string.hu.preferencesDeviceDetails = 'Eszköz részletei';
z.string.hu.preferencesDevices = 'Eszközök';
z.string.hu.preferencesHeadline = 'Beállítások';
z.string.hu.preferencesOptions = 'Beállítások';

z.string.hu.preferencesAboutCopyright = '© Wire Swiss GmbH';
z.string.hu.preferencesAboutPrivacyPolicy = 'Adatvédelmi Nyilatkozat';
z.string.hu.preferencesAboutSupport = 'Ügyfélszolgálat';
z.string.hu.preferencesAboutSupportWebsite = 'Wire Ügyfélszolgálat';
z.string.hu.preferencesAboutSupportContact = 'Kapcsolatfelvétel az Ügyfélszolgálattal';
z.string.hu.preferencesAboutTermsOfUse = 'Felhasználási feltételek';
z.string.hu.preferencesAboutVersion = 'Verzió {{version}}';
z.string.hu.preferencesAboutWebsite = 'Wire weboldala';

z.string.hu.preferencesAccountAvaibilityUnset = 'Állapot beállítása';
z.string.hu.preferencesAccountCreateTeam = 'Csapat létrehozása';
z.string.hu.preferencesAccountDelete = 'Fiók törlése';
z.string.hu.preferencesAccountLogOut = 'Kijelentkezés';
z.string.hu.preferencesAccountManageTeam = 'Csapat kezelése';
z.string.hu.preferencesAccountResetPassword = 'Jelszó visszaállítása';
z.string.hu.preferencesAccountTeam = 'innen: {{name}}';
z.string.hu.preferencesAccountUsernamePlaceholder = 'Teljes neved';
z.string.hu.preferencesAccountUsernameHint = 'Legalább 2 karakter, és kizárólag a—z, 0—9 és _ karakterek.';
z.string.hu.preferencesAccountUsernameAvailable = 'Elérhető';
z.string.hu.preferencesAccountUsernameErrorTaken = 'Már foglalt';

z.string.hu.preferencesAVCamera = 'Kamera';
z.string.hu.preferencesAVMicrophone = 'Mikrofon';
z.string.hu.preferencesAVPermissionDetail = 'Engedélyezze a böngésző Beállításainál';
z.string.hu.preferencesAVSpeakers = 'Hangszórók';

z.string.hu.preferencesDevicesActivatedIn = 'itt: {{location}}';
z.string.hu.preferencesDevicesActivatedOn = 'Legutóbb aktiválva: {{date}}';
z.string.hu.preferencesDevicesActive = 'Aktív';
z.string.hu.preferencesDevicesActiveDetail = 'Ha a fenti eszközök közül valamelyik nem ismerős, akkor töröld azt és változtass jelszót.';
z.string.hu.preferencesDevicesCurrent = 'Ez az eszköz';
z.string.hu.preferencesDevicesFingerprint = 'Eszközazonosító ujjlenyomat';
z.string.hu.preferencesDevicesFingerprintDetail = 'A Wire-ben minden eszköz egyedi ujjlenyomattal rendelkezik. Összehasonlítással ellenőrizd az eszközöket és a beszélgetéseket.';
z.string.hu.preferencesDevicesId = 'Eszközazonosító (ID): ';
z.string.hu.preferencesDevicesRemove = 'Eltávolítás';
z.string.hu.preferencesDevicesRemoveCancel = 'Mégsem';
z.string.hu.preferencesDevicesRemoveDetail = 'Távolítsd el ezt az eszközt, ha már nem használod. Ezzel együtt azonnal ki is jelentkezel erről az eszközről.';
z.string.hu.preferencesDevicesSessionConfirmation = 'A munkamenet alaphelyzetbe lett állítva.';
z.string.hu.preferencesDevicesSessionDetail = 'Ha az ujjlenyomatok nem egyeznek, állítsd vissza a munkamenet, így mindkét oldalon új titkosítási kulcsok jönnek létre.';
z.string.hu.preferencesDevicesSessionReset = 'Munkamenet visszaállítása';
z.string.hu.preferencesDevicesSessionOngoing = 'Munkamenet visszaállítása…';
z.string.hu.preferencesDevicesVerification = 'Ellenőrizve';

z.string.hu.preferencesOptionsAudio = 'Hangjelzések';
z.string.hu.preferencesOptionsAudioAll = 'Minden';
z.string.hu.preferencesOptionsAudioAllDetail = 'Minden hang';
z.string.hu.preferencesOptionsAudioNone = 'Semmi';
z.string.hu.preferencesOptionsAudioNoneDetail = 'Pssszt!';
z.string.hu.preferencesOptionsAudioSome = 'Néhány';
z.string.hu.preferencesOptionsAudioSomeDetail = 'Kopogások és hívások';
z.string.hu.preferencesOptionsContacts = 'Névjegyek';
z.string.hu.preferencesOptionsContactsGmail = 'Importálás Gmail-ből';
z.string.hu.preferencesOptionsContactsMacos = 'Importálás Névjegyek-ből';
z.string.hu.preferencesOptionsContactsDetail = 'A névjegyeid importálásával könnyebben kapcsolatba léphetsz másokkal. Minden információt anonimizálunk, és semmit nem osszuk meg senki mással.';
z.string.hu.preferencesOptionsData = 'Használati adatok és hibajelentések';
z.string.hu.preferencesOptionsDataCheckbox = 'Adatok küldése névtelenül';
z.string.hu.preferencesOptionsDataDetail = 'Anonim információk küldésével segíts nekünk, hogy a Wire még jobb legyen.';
z.string.hu.preferencesOptionsPopular = 'Közkívánatra';
z.string.hu.preferencesOptionsEmojiReplaceCheckbox = 'Cserélje ki a begépelt hangulatjeleket emojikra';
z.string.hu.preferencesOptionsEmojiReplaceDetail = ':-) → {{icon}}';
z.string.hu.preferencesOptionsPreviewsSendCheckbox = 'Előnézet készítése az elküldött hivatkozásokról';
z.string.hu.preferencesOptionsPreviewsSendDetail = 'A más partnerektől kapott hivatkozások előnézete továbbra is látható lesz.';
z.string.hu.preferencesOptionsNotifications = 'Értesítések';
z.string.hu.preferencesOptionsNotificationsNone = 'Kikapcsolva';
z.string.hu.preferencesOptionsNotificationsObfuscate = 'Részletek elrejtése';
z.string.hu.preferencesOptionsNotificationsObfuscateMessage = 'Küldő mutatása';
z.string.hu.preferencesOptionsNotificationsOn = 'Küldő és üzenet mutatása';

z.string.hu.searchConnect = 'Csatlakozás';
z.string.hu.searchConnections = 'Kapcsolatok';
z.string.hu.searchContacts = 'Névjegyek';
z.string.hu.searchCreateGroup = 'Csoport létrehozása';
z.string.hu.searchGroups = 'Csoportok';
z.string.hu.searchPeople = 'Partner';
z.string.hu.searchPlaceholder = 'Keresés név vagy felhasználónév alapján';
z.string.hu.searchServices = 'Szolgáltatások';
z.string.hu.searchTeamGroups = 'Csapat beszélgetés';
z.string.hu.searchTeamMembers = 'Csapattagok';
z.string.hu.searchTopPeople = 'Top Partnerek';
z.string.hu.searchTrySearch = 'Partnerek keresése\nnév vagy felhasználónév alapján';
z.string.hu.searchNoContactsOnWire = 'Nincsenek névjegyeid a Wire-ön.\nPróbálj új partnereket keresni, \nnév vagy @felhasználónév alapján.';
z.string.hu.searchMemberInvite = 'Hívj meg másokat a csapatba';
z.string.hu.searchOthers = 'Csatlakozás';

z.string.hu.uploadGoogleHeadline = 'Keress partnereket\na Wire-ön.';
z.string.hu.uploadGoogleMessage = 'A névjegyeid importálásával könnyebben kapcsolatba léphetsz másokkal. Minden információt anonimizálunk, és semmit nem osszuk meg senki mással.';
z.string.hu.uploadGoogleHeadlineError = 'Valami nem stimmel.';
z.string.hu.uploadGoogleMessageError = 'Nem kaptuk meg az adataidat. Kérjük, próbáld meg újra a névjegyek importálását.';
z.string.hu.uploadGoogleButtonAgain = 'Újra próbálás';

z.string.hu.urlSupportRoot = '/';
z.string.hu.urlSupportArticles = '/hc/en-us/articles/';
z.string.hu.urlSupportRequests = '/hc/en-us/requests/';
z.string.hu.urlWebappRoot = '/';
z.string.hu.urlWebsiteRoot = '/';
z.string.hu.urlWebsiteCreateTeam = '/csapat-létrehozása/';
z.string.hu.urlWebsitePrivacy = '/adatvédelem';
z.string.hu.warningCallDetail = 'A hívásokhoz a böngésződnek hozzá kell férnie a mikrofonodhoz.';
z.string.hu.warningCallHeadline = 'Nem kezdeményezhetsz hívást mikrofon nélkül';
z.string.hu.warningCallUnsupportedIncoming = '{{user}} hív. Böngésződ nem támogatja a hanghívásokat.';
z.string.hu.warningCallUnsupportedOutgoing = 'Nem kezdeményezhetsz hívást, mert böngésződ nem támogatja a hanghívásokat.';
z.string.hu.warningCallIssues = 'Ezzel a Wire verzióval nem tudsz részt venni a hívásban. Kérjük, használd ezt:';
z.string.hu.warningCallUpgradeBrowser = 'Kérjük, hogy hanghívásokhoz frissítsd a Google Chrome-ot.';
z.string.hu.warningConnectivityConnectionLost = 'Kapcsolódási kísérlet folyamatban. A Wire most nem tud üzeneteket kézbesíteni.';
z.string.hu.warningConnectivityNoInternet = 'Nincs internet. Üzenetek küldése és fogadása most nem lehetséges.';
z.string.hu.warningLearnMore = 'További információ';
z.string.hu.warningLifecycleUpdate = 'Elérhető a Wire új verziója.';
z.string.hu.warningLifecycleUpdateNotes = 'Újdonságok';
z.string.hu.warningLifecycleUpdateLink = 'Frissítés most';
z.string.hu.warningNotFoundCamera = 'Nem kezdeményezhetsz hívást, mert nincs kamerád.';
z.string.hu.warningNotFoundMicrophone = 'Nem kezdeményezhetsz hívást, mert nincs mikrofonod.';
z.string.hu.warningPermissionDeniedCamera = 'Nem kezdeményezhetsz hívást, mert böngésződ nem férhet hozzá a kamerádhoz.';
z.string.hu.warningPermissionDeniedMicrophone = 'Nem kezdeményezhetsz hívást, mert böngésződ nem férhet hozzá a mikrofonodhoz.';
z.string.hu.warningPermissionDeniedScreen = 'A képernyőmegosztást engedélyezned kell a böngészőben.';
z.string.hu.warningPermissionRequestCamera = '{{icon}} Kamera hozzáférés engedélyezése';
z.string.hu.warningPermissionRequestMicrophone = '{{icon}} Mikrofon hozzáférés engedélyezése';
z.string.hu.warningPermissionRequestNotification = '{{icon}} Értesítések engedélyezése';
z.string.hu.warningPermissionRequestScreen = '{{icon}} Képernyőmegosztás engedélyezése';
z.string.hu.warningTellMeHow = 'Mit kell tennem';

z.string.hu.userAvailabilityAvailable = 'Elérhető';
z.string.hu.userAvailabilityAway = 'Nincs a gépnél';
z.string.hu.userAvailabilityBusy = 'Elfoglalt';
z.string.hu.userAvailabilityNone = 'Semmi';

z.string.hu.notificationAssetAdd = 'Megosztott egy képet';
z.string.hu.notificationConnectionAccepted = 'Elfogadta a csatlakozási kérelmedet';
z.string.hu.notificationConnectionConnected = 'Most már csatlakozva vagytok';
z.string.hu.notificationConnectionRequest = 'Szeretne csatlakozni';
z.string.hu.notificationConversationCreate = '{{user}} beszélgetést indított';
z.string.hu.notificationConversationRename = '{{user}} átnevezte a beszélgetést erre: {{name}}';
z.string.hu.notificationMemberJoinMany = '{{user}} hozzáadott {{number}} partnert a beszélgetéshez';
z.string.hu.notificationMemberJoinOne = '{{user1}} hozzáadta {{user2}} partnert a beszélgetéshez';
z.string.hu.notificationMemberLeaveRemovedYou = '{{user}} eltávolított a beszélgetésből';
z.string.hu.notificationObfuscated = 'Üzenetet küldött';
z.string.hu.notificationObfuscatedTitle = 'Valaki';
z.string.hu.notificationPing = 'Kopogott';
z.string.hu.notificationReaction = 'Reagált egy üzenetre: {{reaction}}';
z.string.hu.notificationSharedAudio = 'Megosztott egy hangüzenetet';
z.string.hu.notificationSharedFile = 'Megosztott egy fájlt';
z.string.hu.notificationSharedLocation = 'Megosztott egy helyet';
z.string.hu.notificationSharedVideo = 'Megosztott egy videót';
z.string.hu.notificationVoiceChannelActivate = 'Hív';
z.string.hu.notificationVoiceChannelDeactivate = 'Hívta';

z.string.hu.tooltipConversationAllVerified = 'Minden ujjlenyomat ellenőrizve';
z.string.hu.tooltipConversationCall = 'Hívás';
z.string.hu.tooltipConversationEphemeral = 'Időzített üzenet';
z.string.hu.tooltipConversationFile = 'Fájl hozzáadása';
z.string.hu.tooltipConversationInputPlaceholder = 'Üzenet írása';
z.string.hu.tooltipConversationInputPlaceholderAvailable = '{{user}} elérhető';
z.string.hu.tooltipConversationInputPlaceholderAway = '{{user}} nincs a gépnél';
z.string.hu.tooltipConversationInputPlaceholderBusy = '{{user}} elfoglalt';
z.string.hu.tooltipConversationPeople = 'Partnerek ({{shortcut}})';
z.string.hu.tooltipConversationPicture = 'Kép hozzáadása';
z.string.hu.tooltipConversationPing = 'Kopogás ({{shortcut}})';
z.string.hu.tooltipConversationSearch = 'Keresés';
z.string.hu.tooltipConversationVideoCall = 'Videóhívás';

z.string.hu.tooltipConversationsArchive = 'Archiválás ({{shortcut}})';
z.string.hu.tooltipConversationsArchived = 'Archívum megtekintése ({{number}})';
z.string.hu.tooltipConversationsMore = 'Továbbiak';
z.string.hu.tooltipConversationsNotify = 'Némítás feloldása ({{shortcut}})';
z.string.hu.tooltipConversationsPreferences = 'Beállítások megnyitása';
z.string.hu.tooltipConversationsSilence = 'Némítás ({{shortcut}})';
z.string.hu.tooltipConversationsStart = 'Beszélgetés megkezdése ({{shortcut}})';

z.string.hu.tooltipPeopleAdd = 'Partnerek hozzáadása a beszélgetéshez ({{shortcut}})';
z.string.hu.tooltipPeopleBack = 'Vissza';
z.string.hu.tooltipPeopleBlock = 'Tiltás';
z.string.hu.tooltipPeopleConnect = 'Csatlakozás';
z.string.hu.tooltipPeopleLeave = 'Kilépés a beszélgetésből';
z.string.hu.tooltipPeopleRename = 'Beszélgetés nevének megváltoztatása';
z.string.hu.tooltipPeopleRemove = 'Eltávolítás a beszélgetésből';
z.string.hu.tooltipPeopleUnblock = 'Tiltás feloldása';

z.string.hu.tooltipPreferencesContactsGmail = 'Kapcsolataid megosztásához jelentkezz be Gmail fiókodba';
z.string.hu.tooltipPreferencesContactsMacos = 'Oszd meg névjegyeidet a macOS Névjegyek alkalmazásából';
z.string.hu.tooltipPreferencesPassword = 'Nyiss meg egy másik weboldalt jelszavad visszaállításához';
z.string.hu.tooltipPreferencesPicture = 'Profilkép módosítása…';
z.string.hu.tooltipPreferencesRename = 'Név módosítása';

z.string.hu.tooltipSearchClose = 'Bezárás (Esc)';

z.string.hu.initReceivedSelfUser = 'Szia {{user}}!';
z.string.hu.initValidatedClient = 'Kapcsolatok és a beszélgetések lekérése';
z.string.hu.initReceivedUserData = 'Új üzenetek megtekintése';
z.string.hu.initDecryption = 'Üzenetek visszafejtése';
z.string.hu.initEvents = 'Üzenetek betöltése';
z.string.hu.initUpdatedFromNotifications = 'Majdnem kész - Élvezd a Wire-t';
z.string.hu.initProgress = ' — {{number1}} / {{number2}}';

z.string.hu.ephememalUnitsNone = 'Kikapcsolva';
z.string.hu.ephememalUnitsSecond = 'másodperc';
z.string.hu.ephememalUnitsSeconds = 'másodperc';
z.string.hu.ephememalUnitsMinute = 'perc';
z.string.hu.ephememalUnitsMinutes = 'perc';
z.string.hu.ephememalUnitsHour = 'óra';
z.string.hu.ephememalUnitsHours = 'óra';
z.string.hu.ephememalUnitsDay = 'nap';
z.string.hu.ephememalUnitsDays = 'nap';

