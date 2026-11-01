# -*- coding: utf-8 -*-
"""
gallery_data.py — single source of truth for Collection 01: Illuminated Engravings.

Both tools/make_gallery_images.py and tools/build_gallery.py read from here.
Edit this file, re-run the two scripts, and the site is regenerated.

  python3 tools/make_gallery_images.py     # masters -> assets/gallery/*.webp
  python3 tools/build_gallery.py           # -> gallery.html, gallery/*.html, sitemap.xml

NOTE: gallery.html and gallery/*.html are GENERATED. Hand-edits to them are lost
on the next build — change the template in build_gallery.py or the copy here.
"""

SITE = "https://www.watchmanforge.com"

# Root of the master artwork vault (Windows-side OneDrive, via WSL).
MASTER_ROOT = ("/mnt/c/Users/sirdo/OneDrive/Claude/Brain Vault/"
               "Etsy Designs/C01 Illuminated Engravings")

COLLECTION = "Collection 01 — Illuminated Engravings"

# ── Colorway registers ───────────────────────────────────────────────────────
# accent  = the --accent CSS override for pieces in this register.
# All five are now sampled from the delivered masters: hue taken from the
# chromatic hue-peak across the register's three plates, then deepened to the
# one-accent-as-light recipe (raw glow highlights read paler than the accent
# should). ashen and royal were previously inverted — ashen carried a bone-blue
# that appears in none of its plates while royal carried ashen's gold.
REGISTERS = {
    "ember": {
        "name": "Ember",
        "theme": "Wrath &amp; Judgment",
        "accent": "#f2762f", "accent_rgb": "242,118,47",
        "blurb": "The fire that falls. Judgment, the last act, the hand that "
                 "no army stops — lit in forge-ember red.",
    },
    "signal": {
        "name": "Signal",
        "theme": "The Vigil",
        "accent": "#25d3d8", "accent_rgb": "37,211,216",
        "blurb": "The watch that does not sleep. Cold signal teal on the gate, "
                 "the ascent, and the war behind the war.",
    },
    "verdant": {
        "name": "Verdant",
        "theme": "Mercy &amp; Life",
        "accent": "#3fd97a", "accent_rgb": "63,217,122",
        "blurb": "Breath returning to what was finished. The road crossed, "
                 "the valley of bones, the father who ran.",
    },
    "ashen": {
        "name": "Ashen",
        "theme": "Glory",
        "accent": "#efc880", "accent_rgb": "239,200,128",
        "blurb": "Glory with nothing burning in it. Pale gold and white "
                 "radiance on the empty tomb, the ascending cloud, and the "
                 "feed trough.",
    },
    "royal": {
        "name": "Royal",
        "theme": "Kingship &amp; Majesty",
        "accent": "#b788f2", "accent_rgb": "183,136,242",
        "blurb": "Majesty that answers to no one. Deep purple on the throne, "
                 "the colt, and the city coming down.",
    },
}

REGISTER_ORDER = ["ember", "signal", "verdant", "ashen", "royal"]

# ── The fifteen pieces ───────────────────────────────────────────────────────
# master : path under MASTER_ROOT — "<VaultRegister>/<Scene (Source Pg)>/<file>".
#          The vault register folder is the artwork's own colorway folder and is
#          NOT always the site register below (New Jerusalem lives under Royal/
#          but ships in the ashen colorway). Note the folder is "Signal Teal".
# etsy   : live listing URL. build_gallery.py validates the /listing/<id>/
#          shape and names any piece that fails, so a stub cannot ship quietly.
PIECES = [
    {
        "slug": "he-is-risen",
        "title": "He Is Risen",
        "register": "ashen",
        "verse": "He is not here: for he is risen, as he said. Come, see the "
                 "place where the Lord lay.",
        "ref": "Matthew 28:6",
        "tag": "The first sermon of the new creation is four words long.",
        "scene": [
            "The women came at first light carrying spices, on their way to "
            "finish a burial. What they found was a stone already moved and an "
            "angel sitting on it — not guarding the tomb, but sitting on the "
            "door of it like a man resting after work.",
            "He does not begin with an explanation. He begins with an absence: "
            "<em>He is not here.</em> Then he does something stranger still — he "
            "invites them in to look at the empty shelf of rock. Everything the "
            "Church has ever said follows from a room with nothing in it.",
        ],
        "master": "Ashen/Angel (Dore Pg 91)/WatchmanForge_HeIsRisen_AngelSepulchre_Print.png",
        "etsy": "https://www.etsy.com/listing/4540134755/matthew-286-he-is-risen-angel-at-the",
    },
    {
        "slug": "wisdom",
        "title": "Wisdom",
        "register": "royal",
        "verse": "Behold, I have done according to thy words: lo, I have given "
                 "thee a wise and an understanding heart; so that there was none "
                 "like thee before thee, neither after thee shall any arise like "
                 "unto thee.",
        "ref": "1 Kings 3:12",
        "tag": "Offered anything, the young king asked for a listening heart.",
        "scene": [
            "God comes to Solomon at Gibeon and makes an open offer: ask what I "
            "shall give thee. A new king with a contested throne could have asked "
            "for a long reign, for wealth, for the death of his rivals. He asks "
            "instead for an understanding heart to judge a people too numerous to "
            "be numbered.",
            "The restraint is the whole point — and it is what the answer "
            "rewards. What is given is not information but discernment: the "
            "capacity to hear two claims and know which one is true. Everything "
            "Solomon is later famous for is downstream of the one thing he "
            "thought to ask for.",
        ],
        "master": "Royal/Solomon (Dore Pg 36)/WatchmanForge_Wisdom_Solomon_Print.png",
        "etsy": "https://www.etsy.com/listing/4540664013/1-kings-312-wisdom-king-solomon",
    },
    {
        "slug": "behold",
        "title": "Behold",
        "register": "royal",
        "verse": "And the multitudes that went before, and that followed, cried, "
                 "saying, Hosanna to the son of David: Blessed is he that cometh "
                 "in the name of the Lord; Hosanna in the highest.",
        "ref": "Matthew 21:9",
        "tag": "He rides in on a borrowed colt, and the crowd sings a coronation.",
        "scene": [
            "He comes into Jerusalem over cloaks and palm branches, on an animal "
            "nobody would choose for a triumph. The crowd shouts a line out of "
            "Psalm 118 that every person present has known since childhood — and "
            "they know exactly what it is. It is not a welcome. It is a "
            "coronation.",
            "<em>Hosanna</em> means <em>save us now</em>. Within the week the same "
            "city will have made a different decision about him. He rides in "
            "anyway, on purpose, at the hour of his choosing.",
        ],
        "master": "Royal/Triumph Entry (Dore Pg 69)/WatchmanForge_Behold_TriumphalEntry_Print.png",
        "etsy": "https://www.etsy.com/listing/4540680317/matthew-219-behold-triumphal-entry-of",
    },
    {
        "slug": "the-holy-city",
        "title": "The Holy City",
        "register": "royal",
        "verse": "And I John saw the holy city, new Jerusalem, coming down from "
                 "God out of heaven, prepared as a bride adorned for her husband.",
        "ref": "Revelation 21:2",
        "tag": "The city is not built up from the ground. It comes down.",
        "scene": [
            "John has just watched the first heaven and the first earth go, and "
            "the sea with them. Then the city arrives — and the direction matters "
            "more than the architecture. It is not raised by anyone's hands. It "
            "descends, already finished, out of heaven from God.",
            "He does not describe it as a fortress or a capital. He describes it "
            "as a bride, dressed for her husband. After all the seals and trumpets "
            "and bowls, the last image in the book is a wedding, held in a city "
            "that came down.",
        ],
        "master": "Royal/New Jerusalem (Dore)/WatchmanForge_TheHolyCity_NewJerusalem_Print.png",
        "etsy": "https://www.etsy.com/listing/4540690729/revelation-212-the-holy-city-new",
    },
    {
        "slug": "struck-in-the-night",
        "title": "Struck in the Night",
        "register": "ember",
        "verse": "Then the angel of the LORD went forth, and smote in the camp of "
                 "the Assyrians a hundred and fourscore and five thousand: and "
                 "when they arose early in the morning, behold, they were all dead "
                 "corpses.",
        "ref": "Isaiah 37:36",
        "tag": "The decisive battle in Isaiah has no human soldiers in it.",
        "scene": [
            "Sennacherib had taken every fortified city of Judah and sent Hezekiah "
            "a letter explaining, correctly, that no god of any nation had ever "
            "stopped him. Hezekiah carried the letter into the house of the LORD "
            "and spread it open there.",
            "That night one angel went through the camp. The siege ended before "
            "morning, and the Assyrian king went home to Nineveh — the whole "
            "campaign undone without a single sword lifted on the other side.",
        ],
        "master": "Ember/Sennacherib (Dore Pg 45)/WatchmanForge_StruckInTheNight_Sennacherib_Print.png",
        "etsy": "https://www.etsy.com/listing/4537737959/isaiah-3736-angel-of-the-lord-struck-in",
    },
    {
        "slug": "stand-therefore",
        "title": "Stand Therefore",
        "register": "ember",
        "verse": "Put on the whole armour of God, that ye may be able to stand "
                 "against the wiles of the devil.",
        "ref": "Ephesians 6:11",
        "tag": "Death holds up the hourglass. The rider does not look at it.",
        "scene": [
            "D&uuml;rer's knight has been read for five centuries as the Christian "
            "soldier on the road. Death rides up beside him with an hourglass; the "
            "devil trails at his back; the way down the ravine is narrow and the "
            "castle on the ridge is a long way off.",
            "He does not fight either of them. He does not argue. He rides past. "
            "Paul's word to the Ephesians is not <em>charge</em> — it is "
            "<em>stand</em>. Put the armour on and hold the ground you were given. "
            "Everything in the frame is built to move him, and he is not moving.",
        ],
        "master": "Ember/Knight (Durer 1513)/WatchmanForge_StandTherefore_ArmorOfGod_Print.jpg",
        "etsy": "https://www.etsy.com/listing/4537334431/ephesians-611-armor-of-god-knight",
        "source": "Albrecht D&uuml;rer, <em>Knight, Death and the Devil</em> (1513) &mdash; public domain",
    },
    {
        "slug": "the-light-shines-on",
        "title": "The Light Shines On",
        "register": "signal",
        "verse": "And the light shineth in darkness; and the darkness "
                 "comprehended it not.",
        "ref": "John 1:5",
        "tag": "The fire goes up. The man on the steps is left in the dark.",
        "scene": [
            "John opens his gospel with the whole story compressed into one line "
            "of physics: light in darkness, and the darkness could not take hold "
            "of it. The word behind <em>comprehended</em> carries both senses at "
            "once — the dark neither understood the light nor overcame it.",
            "The plate is Elijah's ascent: the chariot going up in a whirlwind and "
            "Elisha flat against the stone below, watching his master leave. The "
            "light does not go out when it leaves the frame. It goes on.",
        ],
        "master": "Signal Teal/Elijah (Dore Pg 41)/WatchmanForge_LightInTheDarkness_Print.png",
        "etsy": "https://www.etsy.com/listing/4537217087/john-15-the-light-shines-in-darkness",
    },
    {
        "slug": "he-keeps-the-gate",
        "title": "He Keeps the Gate",
        "register": "signal",
        "verse": "The LORD shall preserve thy going out and thy coming in from "
                 "this time forth, and even for evermore.",
        "ref": "Psalm 121:8",
        "tag": "The going out and the coming in — both ends of every road.",
        "scene": [
            "Psalm 121 is a song of ascents, sung by pilgrims on the climb up to "
            "Jerusalem, where the road was long and the danger was real. It never "
            "promises an easy journey. It promises a keeper who does not sleep.",
            "In the plate the figure stands in the gateway with his hands raised, "
            "lit by a cold line of light along the lintel, and the sleepers at his "
            "feet do not stir. The gate is the threshold every watchman knows. "
            "Whoever holds it holds the whole road.",
        ],
        "master": "Signal Teal/David (Dore Pg 35)/WatchmanForge_HeKeepsTheGate_Print.png",
        "etsy": "https://www.etsy.com/listing/4537239108/psalm-121-wall-art-he-keeps-the-gate",
    },
    {
        "slug": "not-flesh-not-blood",
        "title": "Not Flesh, Not Blood",
        "register": "signal",
        "verse": "For we wrestle not against flesh and blood, but against "
                 "principalities, against powers, against the rulers of the "
                 "darkness of this world, against spiritual wickedness in high "
                 "places.",
        "ref": "Ephesians 6:12",
        "tag": "A host of armed men riding toward something no sword reaches.",
        "scene": [
            "Paul is writing to a church inside a garrison city, to people who "
            "knew what an army looked like, and he tells them the enemy is not the "
            "man across the field. The war is older and higher than the one "
            "anybody can see.",
            "The plate gives you the column under a black sky, spears along the "
            "horizon, riding down into the valley. The light tearing open the "
            "cloud ahead of them is not a sunrise. It is the other combatant.",
        ],
        "master": "Signal Teal/Gibeon (Dore Pg 20)/WatchmanForge_NotFleshNotBlood_Print.png",
        "etsy": "https://www.etsy.com/listing/4537288590/ephesians-612-not-flesh-not-blood",
    },
    {
        "slug": "let-me-die-with-them",
        "title": "Let Me Die With Them",
        "register": "ember",
        "verse": "And Samson said, Let me die with the Philistines. And he bowed "
                 "himself with all his might; and the house fell upon the lords, "
                 "and upon all the people that were therein. So the dead which he "
                 "slew at his death were more than they which he slew in his life.",
        "ref": "Judges 16:30",
        "tag": "His last act, and his strongest.",
        "scene": [
            "They brought him out to entertain them — shaved, blinded, chained "
            "between the columns of Dagon's house with three thousand watching "
            "from the roof. He asked the boy leading him to set him where he could "
            "feel the pillars.",
            "It is the last line Samson speaks in scripture, and it is as much a "
            "prayer as a vow. The strength came back for exactly one act. It was "
            "enough.",
        ],
        "master": "Ember/Samson (Dore Pg 27)/WatchmanForge_LetMeDieWithThem_Samson_Print.png",
        "etsy": "https://www.etsy.com/listing/4537690125/judges-1630-death-of-samson-let-me-die",
    },
    {
        "slug": "he-had-compassion",
        "title": "He Had Compassion",
        "register": "verdant",
        "verse": "But a certain Samaritan, as he journeyed, came where he was: and "
                 "when he saw him, he had compassion on him,",
        "ref": "Luke 10:33",
        "tag": "Two men saw him and crossed the road. The third one stopped.",
        "scene": [
            "A priest came down that way and passed by on the other side. A Levite "
            "did the same. The third traveller is the one the original audience had "
            "been raised to despise — and he is the one who gets down off his "
            "animal.",
            "Jesus tells the story to a lawyer who was hoping to have the word "
            "<em>neighbour</em> narrowed down for him. The parable widens it "
            "instead, until there is nowhere left to stand.",
        ],
        "master": "Verdant/Good Samaritan (Dore Pg 73)/WatchmanForge_HeHadCompassion_GoodSamaritan_Print.png",
        "etsy": "https://www.etsy.com/listing/4539880805/luke-1033-good-samaritan-he-had",
    },
    {
        "slug": "these-bones-shall-live",
        "title": "These Bones Shall Live",
        "register": "verdant",
        "verse": "Thus saith the Lord GOD unto these bones; Behold, I will cause "
                 "breath to enter into you, and ye shall live:",
        "ref": "Ezekiel 37:5",
        "tag": "Set down in a valley of bones, and told to preach to them.",
        "scene": [
            "The prophet is carried out and set down in the middle of a valley "
            "full of bones — very many, and very dry. God asks him whether they can "
            "live, and Ezekiel gives the only honest answer available: <em>O Lord "
            "GOD, thou knowest.</em>",
            "Then he is told to prophesy to them. There is a noise, and a shaking, "
            "and bone comes to bone; sinew, flesh, skin, and finally breath. Israel "
            "in exile had said their hope was lost and they were cut off. This was "
            "the reply.",
        ],
        "master": "Verdant/Ezekiel (Dore Pg 48)/WatchmanForge_TheseBonesShallLive_Ezekiel_Print.png",
        "etsy": "https://www.etsy.com/listing/4539906729/ezekiel-375-valley-of-dry-bones-these",
    },
    {
        "slug": "his-father-saw-him",
        "title": "His Father Saw Him",
        "register": "verdant",
        "verse": "And he arose, and came to his father. But when he was yet a "
                 "great way off, his father saw him, and had compassion, and ran, "
                 "and fell on his neck, and kissed him.",
        "ref": "Luke 15:20",
        "tag": "He never gets to finish the speech he rehearsed.",
        "scene": [
            "The son has spent the inheritance, fed pigs for a living, and worked "
            "out a speech on the road home about being taken on as a hired servant. "
            "He gets about half of it out.",
            "The father sees him while he is yet a great way off — which means the "
            "father had been watching that road — and then does the undignified "
            "thing and runs. The parable is usually named for the son. It is really "
            "about the man on the road.",
        ],
        "master": "Verdant/Prodigal Son (Dore Pg 75)/WatchmanForge_HisFatherSawHim_ProdigalSon_Print.png",
        "etsy": "https://www.etsy.com/listing/4539956226/luke-1520-prodigal-son-his-father-saw",
    },
    {
        "slug": "a-cloud-received-him",
        "title": "A Cloud Received Him",
        "register": "ashen",
        "verse": "And when he had spoken these things, while they beheld, he was "
                 "taken up; and a cloud received him out of their sight.",
        "ref": "Acts 1:9",
        "tag": "Two men in white ask why they are still looking at the sky.",
        "scene": [
            "The last thing the disciples see is him going up, and then the cloud "
            "takes him — the same cloud that filled the tabernacle and covered "
            "Sinai, the visible weight of the presence of God.",
            "They are still staring upward when two men in white clothing ask them "
            "why. He will come back the same way he left. Until then the watch is "
            "theirs, and the book of Acts is what they did with it.",
        ],
        "master": "Ashen/Ascension (Dore Pg 93)/WatchmanForge_ACloudReceivedHim_Ascension_Print.png",
        "etsy": "https://www.etsy.com/listing/4540084350/acts-19-the-ascension-a-cloud-received",
    },
    {
        "slug": "unto-you-is-born",
        "title": "Unto You Is Born",
        "register": "ashen",
        "verse": "For unto you is born this day in the city of David a Saviour, "
                 "which is Christ the Lord.",
        "ref": "Luke 2:11",
        "tag": "The birth notice went to the night shift.",
        "scene": [
            "The announcement is made to shepherds working a night watch in the "
            "fields outside Bethlehem — the least credentialed witnesses on offer "
            "anywhere in the region.",
            "The angel gives them three titles in a single sentence: Saviour, "
            "Christ, Lord. Then a sign that appears to undercut every one of them "
            "— a baby, wrapped in swaddling clothes, lying in a feed trough. Both "
            "halves are true at once, and that is the whole scandal of it.",
        ],
        "master": "Ashen/Nativity (Dore Pg 57)/WatchmanForge_UntoYouIsBorn_Nativity_Print.png",
        "etsy": "https://www.etsy.com/listing/4540099579/luke-211-the-nativity-unto-you-is-born",
    },
]

# Featured on the homepage teaser. index.html is hand-maintained, not generated —
# this list documents what is hard-coded in the #gallery-teaser section there.
HOMEPAGE_FEATURED = ["he-keeps-the-gate", "stand-therefore", "struck-in-the-night"]

# Default source credit when a piece does not override it.
DEFAULT_SOURCE = ("Gustave Dor&eacute;, Bible engravings (1866) &mdash; public domain, "
                  "transformed under original creative direction")


def by_slug(slug):
    for p in PIECES:
        if p["slug"] == slug:
            return p
    raise KeyError(slug)


def in_register(reg):
    return [p for p in PIECES if p["register"] == reg]
