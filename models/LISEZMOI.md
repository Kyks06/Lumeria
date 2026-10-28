# Modèles 3D (facultatifs)

Le jeu fonctionne **sans aucun fichier** : personnages, Lumins, arbres et rochers sont générés en 3D.
Vous pouvez remplacer n'importe lequel par votre propre modèle `.glb` :

1. Déposez le fichier dans le bon dossier (voir ci-dessous).
2. **Listez-le dans `models/manifest.json`** (le jeu ne charge que les fichiers listés, ce qui évite
   des dizaines d'erreurs 404 au démarrage).

```json
{
  "characters": ["player.glb", "player_f.glb", "npc.glb"],
  "env": ["tree.glb", "pine.glb", "rock.glb"],
  "creatures": ["cendrino.glb", "germelin.glb"]
}
```

## Personnages — `models/`

| Fichier | Rôle | Animations reconnues |
|---|---|---|
| `player.glb` | joueur (garçon) | `Idle`, `Walk`, `Run` |
| `player_f.glb` | joueuse (fille) | `Idle`, `Walk`, `Run` |
| `npc.glb` | tous les PNJ et dresseurs | `Idle`, `Walk` |

## Décors — `models/env/`

`tree.glb` (feuillus), `pine.glb`, `palm.glb`, `cactus.glb`, `deadtree.glb`, `rock.glb`, `bush.glb`, `grass.glb` (brin d'herbe).
Les bâtiments et intérieurs restent générés (ils doivent correspondre aux portes et collisions).

## Lumins — `models/creatures/<id>.glb`

Animations reconnues : `Idle`, `Attack`, `Hit`, `Faint` (une animation absente est remplacée par une animation procédurale).
Les 133 identifiants (voir `src/config/creatures.js`) :

```
germelin.glb       sylvaran.glb       arbrorex.glb       cendrino.glb       pyrolion.glb       heliorax.glb
ondelin.glb        abyssor.glb        leviathorn.glb     piaflet.glb        ventaplume.glb     cyclonaire.glb
grignou.glb        ronflard.glb       larvelle.glb       cocolune.glb       papillume.glb      scaraboc.glb
cornegard.glb      voltignon.glb      fulgurix.glb       mousseron.glb      champaro.glb       ronronce.glb
felinoble.glb      spectrelle.glb     lanterlune.glb     lucifade.glb       hiboulune.glb      duclune.glb
venisouffle.glb    cobrasque.glb      fourmire.glb       fourmagma.glb      glandouille.glb    noiseraie.glb
bulline.glb        bullaria.glb       carpillon.glb      gyralame.glb       pincrabe.glb       krabastion.glb
goelix.glb         albatrombe.glb     meduvolt.glb       medulgor.glb       coquibou.glb       carapalme.glb
coralys.glb        rocaillon.glb      bastionyx.glb      galetron.glb       galetonne.glb      chauvelin.glb
vampyrix.glb       boulonix.glb       mecarion.glb       cristalis.glb      prismalith.glb     taupinox.glb
excavor.glb        brisolet.glb       tornadis.glb       cabriroc.glb       bouquetor.glb      aquilame.glb
aquilacier.glb     cactardent.glb     cactoros.glb       sablard.glb        sablaurus.glb      desertor.glb
scorpiaride.glb    scorpiroi.glb      fennevolt.glb      fennolux.glb       mimoplasme.glb     marecroa.glb
bourbaroa.glb      toxilime.glb       toxilith.glb       pleurolle.glb      saulombre.glb      libelame.glb
odonastre.glb      floconnet.glb      givrelle.glb       morsglace.glb      morsabyss.glb      morsatlas.glb
pingrelot.glb      empereglace.glb    neigeot.glb        yetigrond.glb      givrenard.glb      blizzenard.glb
tisonnet.glb       salamandrex.glb    magmolle.glb       volcarapace.glb    fumerolle.glb      brasaigle.glb
charbonnet.glb     brasipoing.glb     halorin.glb        seraphyne.glb      psylou.glb         psymage.glb
arcaneon.glb       cometin.glb        meteorion.glb      robotin.glb        androidum.glb      lumifee.glb
lumirelle.glb      lumicorne.glb      boxeroc.glb        titanpoing.glb     colossard.glb      karaplume.glb
martiale.glb       drakonet.glb       drakor.glb         astradrake.glb     sabrelame.glb      gresilon.glb
electrapode.glb    terragorn.glb      aeroneth.glb       thalassyre.glb     nyctaris.glb       solarion.glb
zenithar.glb
```

## Conseils

- Modèle tourné vers **+Z**, pieds à y = 0. La taille est ajustée automatiquement
  (hauteurs cibles dans `src/config/models.js`, champ `height` de chaque créature).
- Les noms d'animation sont reconnus sans tenir compte de la casse et même s'ils contiennent
  le mot-clé (`Armature|Idle`, `idle_loop`…). Synonymes : voir `CLIP_NAMES` dans `src/config/models.js`.
- Les fichiers compressés Draco ou Meshopt sont pris en charge.
- Gardez des modèles légers (moins de 20 000 triangles par Lumin) : jusqu'à 25 Lumins sauvages
  peuvent être visibles en même temps sur une route.
