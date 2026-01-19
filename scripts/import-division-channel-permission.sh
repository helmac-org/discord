#!/bin/sh

# scripts/import-channel-permission.sh
# Example: scripts/import-channel-permission.sh


# List of all divisions with their IDs (parallel arrays)
# Each line: "division-name:role_id:channel_id"
divisions="
hradební-divize:1222283151666057256:1222284195490037914:1221964089983766608
hospoda:1222283255563423784:1222283988631027763:1221964161597313104
mimobitevní-program:1462755505159274705:1462755540395364352:1221964177237741568
kuchyň:1222283684086939738:1222284847960031262:1221964219776241754
otrocké-práce:1222283738566623243:1222284969448308907:1221964335690158191
školka:1222283829109325896:1222285062322520095:1221964367101165750
registračka:1222283869852663900:1222285144078024775:1221964443898875957
zázemí:1222283910365450281:1222284392458752071:1222281613426036928
marketing:1222283950936817686:1222284044658540564:1222281757374808076
příprava-bitvy:1222294284846366810:1222294204277854218:1222294162142003370
rekvizity:1316080463487696926:1316081320031551612:1316087021395247114
pravidla-bitvy:1355536633654415460:1355537054225666117:1355537750979252334
turnaje:1222283619129757827:1222284563317919934:1371449075689590784
zdravotníci:1381598446162546829:1381598675909742747:1381599471573667890
harém:1407476719404974120:1407476894420701395:1407477800843350150
ritual:1462755522972483748:1415336666557714533:1415336666557714533
"
# List of other roles with their IDs
# Each line: "role-name:override_id"
roles="
admin:1221966144131432508
tatka-smoula:1314998564094476430
garant-bez-portfeje:1315023225092047030
everyone:1221956494145355777
cumil:1314960649394327703
"

# Loop over each division
while IFS=: read -r division division_role_garant_id division_role_clen_id division_channel_id; do
  # Skip empty lines
  [ -z "$division" ] && continue

  echo "Processing division: $division (Garant ID: $division_role_garant_id) (Clen ID $division_role_clen_id) (Channel ID: $division_channel_id)"

    terraform import discord_channel_permission.divize-garant\[\"$division\"\] $division_channel_id:$division_role_garant_id:role
    terraform import discord_channel_permission.divize-clen\[\"$division\"\] $division_channel_id:$division_role_clen_id:role
  # Loop over each role for this division
  while IFS=: read -r role role_id; do
    # Skip empty lines
    [ -z "$role" ] && continue

    echo "  Processing role: $role (ID: $role_id) for division: $division"

    terraform import discord_channel_permission.divize-$role\[\"$division\"\] $division_channel_id:$role_id:role
    echo ""
done <<EOFa
$roles
EOFa
done <<EOF
$divisions
EOF


