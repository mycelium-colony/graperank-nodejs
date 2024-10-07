# GrapeRank
A Nostr reccomedation engine, powered by Webs of Trust and grapes

GrapeRankl ingests and ouptuts Grapevine reccomendation lists. It is the open source algorithm behind [My Grapevine](https://grapevine.my), smarter webs of trust for Nostr. 


The **GrapeRank Interpretor** harvests network data according to given protocols (follows, mutes, zaps, ect...) and generates "ratings" for the calculator to consume. It will even querry third-party services for interpretations if it recieves a protocol request that it cannot run.

The **GrapeRank Calculator** calculates the influence score for each interpreted rating in relation to (you) the network observer. These influence scores (for content and users) are compiled from the influence scores of each person in the input Grapevine list (or available network) who rated them.


![GrapeRank Infographic](assets/graperank-infographic.png)