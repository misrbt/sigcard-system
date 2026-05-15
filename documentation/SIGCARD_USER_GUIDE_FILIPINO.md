# Gabay sa Paggamit ng DIGICUR
### *Digital Customer Record System*
## *(Giya sa Paggamit sa DIGICUR (Digital Customer Record System))*

**Pang-araw-araw na gabay para sa mga staff ng RBT Bank Inc.**
*Pinadali at pinasimple — para sa lahat ng gumagamit ng sistema.*
*Rural Bank of Talisayan, Misamis Oriental*

---

## Maligayang Pagdating! *(Malipayong Pag-abot!)*

Itong gabay na ito ay para sa lahat ng staff ng RBT Bank na gumagamit ng DIGICUR (Digital Customer Record System) — mga teller, banking officer, branch manager, compliance officer, at administrator. **Hindi mo kailangan maging eksperto sa computer.** Lahat ng hakbang ay ipapaliwanag sa simpleng Tagalog at Bisaya.

> **Tandaan:** Ang **English na bersyon** ng manwal na ito (`SIGCARD_USER_GUIDE.md`) ang pangunahing manwal. Itong Filipino/Bisaya guide na ito ay panukat na pantulong para mas madali mong maintindihan. Kapag may pagkakaiba, sundin ang opisyal na English manwal.

---

## Saang Bahagi Ka Magbabasa? *(Asa Nimo Basahon?)*

| Kung ikaw ay... | Basahin ang... |
|---|---|
| Bagong gumagamit (lahat) | Bahagi 1 — Pagsisimula |
| **Banking Officer** (nag-uupload ng signature card) | Bahagi 1 + Bahagi 3 |
| **Cashier / Teller** (tumitingin lang ng customer info) | Bahagi 1 + Bahagi 4 |
| **Branch Manager** | Bahagi 1 + Bahagi 5 |
| **Compliance Auditor** | Bahagi 1 + Bahagi 6 |
| **System Administrator** | Bahagi 1 + Bahagi 7 |
| Lahat | Bahagi 8 — Mga Karaniwang Gawain at Bahagi 9 — Tulong |

---

## Bahagi 1 — Pagsisimula *(Pagsugod)*

### 1.1 Ano ang DIGICUR (Digital Customer Record System)?

Sa simpleng salita: **isa itong digital na "filing cabinet"** kung saan iniimbak ng banko ang mga signature card ng customer. Imbis na nasa papel sa folder na pwedeng mawala o mabasa, ngayon nasa computer na — ligtas, mabilis hanapin, at may backup.

*(Sa Bisaya: Usa ni ka digital nga "filing cabinet" — diin gitipigan ang mga signature card sa mga kustomer. Imbis nga papel sa folder, naa na sa computer. Luwas, dali pangitaon.)*

### 1.2 Mga Kailangan Mo Bago Magsimula

- **Computer** na may internet
- **Browser** — Google Chrome o Microsoft Edge ang pinakamabuti
- **Link** ng SigCard website (ibibigay ng admin)
- **Email address** mo (na nairehistro ng admin)
- **Password** mo (kadalasan, temporary muna)

### 1.3 Paano Mag-Sign In *(Unsaon Pag-Sign In)*

1. Buksan ang browser.
2. I-type ang website link ng SigCard.
3. Makikita mo ang **"Sign in"** sa gitna ng screen.
4. I-type ang **email address** mo.
5. I-type ang **password** mo.
6. I-click ang asul na **Sign in** button.

Kapag tama, dadalhin ka ng sistema sa iyong home page.

> **Tip:** Kung lumitaw ang pulang error na *"Invalid credentials"*, suriin ang typing mo. Mahalaga ang malalaking titik (CAPS) at maliliit (small letters) sa password.

### 1.4 Unang Pag-Sign In *(Una Nimo Pag-Sign In)*

Sa unang beses na mag-sign in ka — o tuwing ire-reset ng admin ang password mo — pipilitin ka ng sistema na **gumawa ng bagong password**.

1. Mag-sign in gamit ang temporary password (kadalasan: `abc_123`).
2. Lalabas ang "Change Password" screen.
3. I-type ang **temporary password** sa unang kahon.
4. I-type ang **bagong password** mo sa pangalawang kahon.
5. I-type ulit ang **bagong password** sa pangatlong kahon (para sigurado).
6. I-click ang **Change Password**.

Tapos na — gamitin mo na ang bagong password sa susunod na pag-sign in.

> **Mahalaga:** **Wag i-share ang password mo sa kahit kanino**, kahit pa kasamahan mo o tumatawag na sabi galing sa IT. **Wag isulat sa sticky note** na nakadikit sa monitor.

### 1.5 Ano ang Magandang Password? *(Unsa ang Maayong Password?)*

Dapat ang password mo:
- May **8 characters** o higit pa
- May **malaking titik** (A, B, C…)
- May **maliit na titik** (a, b, c…)
- May **numero** (0–9)
- May **special character** tulad ng `!`, `@`, `#`, `$`

**Magandang halimbawa:** `Banko@2026!`, `Talisayan#9`, `Rbt$ave99`

**Masamang halimbawa:** `password`, `12345678`, kaarawan mo, pangalan mo. Madaling hulaan.

### 1.6 Two-Factor Authentication (2FA)

Kung naka-on ang 2FA sa account mo, may dagdag na hakbang sa pag-sign in:

1. Mag-sign in gamit ang email at password.
2. Hihingian ka ng **6-digit code** na ipapadala sa cellphone o email mo.
3. Buksan ang text/email at i-type ang 6 na numero.
4. I-click ang **Verify**.

> **Bakit ito mahalaga:** Kahit may makakuha ng password mo, hindi pa rin nila mapapasok ang account mo kung wala silang phone mo. Malaking proteksyon ito.

### 1.7 Tamang Pag-Sign Out *(Husto nga Pag-Sign Out)*

Pagkatapos mong gamitin ang SigCard, **palaging mag-sign out**. Wag basta sarado lang ang browser.

1. Tingnan ang **kanang itaas** ng screen — makikita mo ang pangalan mo o maliit na bilog.
2. I-click ito. May lalabas na maliit na menu.
3. I-click ang **Logout**.

Babalik ka sa sign-in page.

> **Bakit mahalaga:** Kung walang sign-out, baka may ibang umupo sa computer mo at gamitin ang account mo. Lahat ng gawin nila, ikaw ang lalabas sa audit log.

### 1.8 Kapag Naiwan Ka Sa Desk *(Kung Mubiya Ka sa Desk)*

Para sa proteksyon mo:
- Kung **10 minuto kang walang ginagawa** sa computer (hindi pinipindot ang mouse o keyboard), automatic kang i-sign out ng sistema.
- Babalik ka sa sign-in page.
- **Anumang hindi pa nase-save** (halimbawa, upload na hindi pa natapos) ay maaaring mawala.

> **Tip:** Kung aalis ka ng higit sa ilang minuto, tapusin muna at mag-sign out.

### 1.9 Kapag Nakalimutan ang Password o Na-Lock ang Account

- Kapag **5 beses kang nagkamali ng password**, ila-lock ang account mo for **30 minuto** para sa proteksyon.
- **Wag mag-guess pa.** Tumawag o lumapit sa admin para i-reset.
- Bibigyan ka uli ng admin ng temporary password (`abc_123`). Mag-sign in dito at gumawa ng bagong password (gaya sa Bahagi 1.4).

---

## Bahagi 2 — Hanapin ang Iyong Role *(Pangitaa ang Imong Role)*

Magkaiba ang nakikita ng bawat staff sa DIGICUR (Digital Customer Record System) depende sa trabaho mo. Basahin lang ang bahagi na para sa role mo:

- **Banking Officer** (nag-uupload ng signature card) → Bahagi 3
- **Cashier / Teller** (tumitingin ng customer info) → Bahagi 4
- **Branch Manager** → Bahagi 5
- **Compliance Auditor** → Bahagi 6
- **System Administrator** → Bahagi 7

---

## Bahagi 3 — Banking Officer Guide

Ikaw ang puso ng sistema. Ikaw ang nag-uupload ng signature card, nagdadagdag ng bagong customer, at nag-iingat ng records.

### 3.1 Ang Iyong Home Screen

Pagka-sign in mo, makikita mo ang dark blue na navigation bar sa itaas. May tatlong button:

- **Home** — pasimulang page
- **Upload** — para magdagdag ng bagong customer at signature card
- **Customer Profiles** — para hanapin ang existing customer

Sa **kanang itaas**, makikita mo ang pangalan mo. I-click anytime para makita ang profile mo o mag-sign out.

### 3.2 Pinakamahalagang Gawain: Pag-Upload ng Signature Card

Ito ang pang-araw-araw na trabaho mo. **Step-by-step** ang pag-upload — guguidan ka ng sistema.

**Bago magsimula, ihanda ang mga ito:**
- Pirmadong signature card ng customer
- Pirmadong **Data Privacy Consent form**
- Camera o phone (basta malinaw kunan ng litrato)
- Buong pangalan at account number ng customer
- (Optional) Mga IDs, NAIS form, o iba pang dokumento

#### Hakbang 1 — I-click ang "Upload"

Sa nav bar sa itaas, i-click ang **Upload**.

#### Hakbang 2 — Piliin ang Account Type

Tatanungin ng sistema: **anong klaseng account ito?** May tatlong tile:

- **Regular** — Isang taong may-ari ng account. *Halimbawa: Si Maria Santos nagbukas ng savings account sa pangalan niya lang.*
- **Joint** — Dalawa o higit pang tao na nag-share ng isang account. *Halimbawa: Mag-asawa na may iisang savings.*
- **Corporate** — Negosyo o kumpanya. *Halimbawa: Cooperative o maliit na company.*

I-click ang tamang tile.

#### Hakbang 3 — (Joint Lang) Piliin ang Joint Type

Kung **Joint** ang pinili mo, tatanungin uli: **ITF ba o Non-ITF?**

- **ITF (In Trust For)** — Isang tao ang naghahawak ng account *para sa* iba. *Halimbawa: Magulang na nagbubukas ng account para sa anak.* Ang nag-hahawak ang nag-aasikaso, pero ang pera ay para sa benepisyaryo. **Bawat tao, sariling dokumento.**
- **Non-ITF** — **Magkakapantay** silang lahat na may-ari. Sino sa kanila pwedeng mag-transact. **Iisang set ng dokumento.**

> **Sa Bisaya:** Ang ITF, usa ka tawo nag-hupot sa account "para sa" laing tawo (halimbawa, ginikanan para sa anak). Ang Non-ITF, parehas silang tag-iya — bisan kinsa sa ila pwede mo-transact.

Pag hindi sigurado, itanong sa customer o sa branch manager.

#### Hakbang 4 — Customer Information

I-type ang detalye ng customer:
- **First name**, **Middle name** (optional), **Last name**, **Suffix** (Jr., Sr., III)
- Para sa **Corporate**: **company name**
- Para sa **Joint**: i-click ang **+ Add another holder** para idagdag ang ibang tao

I-click ang **Next**.

#### Hakbang 5 — Account Holder Details

Para sa bawat holder, ipasok:
- **Account Number** — yung account number sa signature card
- **Date Opened** — kailan binuksan ang account
- **Risk Level**:
  - **Low Risk** — karaniwang customer
  - **Medium Risk** — kailangan ng bantay
  - **High Risk** — kailangan ng dagdag pansin (malaki o di-pangkaraniwang transaksyon)
- **Account Status**:
  - **Active** — gamit pa
  - **Dormant** — matagal nang walang transaksyon
  - **Reactivated** — dating dormant, pero ginagamit na ulit
  - **Escheat** — pinabayaan / abandoned (bihira)
  - **Closed** — sarado na

Kung may higit sa isang account ang customer, i-click ang **+ Add another account**.

I-click ang **Next**.

#### Hakbang 6 — Sigcard Upload

I-upload ang dalawang litrato:
- **Front** ng signature card
- **Back** ng signature card

Para sa bawat litrato, pwede mong:
- **I-drag at i-drop** ang file sa kahon, o
- **I-click** ang kahon para mag-browse sa computer

> **Tips para sa magandang litrato:**
> - **Maliwanag** ang ilaw, pero walang glare/sinag
> - **Kompleto** ang lahat ng sulok ng card
> - **Patag** ang papel, **deretso** ang camera
> - **Malinaw** at **mabasa** ang pirma — hindi malabo
> - Pag malabo, retake mo lang at i-upload ulit

May lalabas na green checkmark kapag tama ang pag-upload. I-click ang **Next**.

#### Hakbang 7 — NAIS Upload (Optional)

Ang NAIS ay ang **National Account Information Sheet** — yung form na may detalye ng customer.

- Kung may NAIS form ang customer, i-upload ang **front at back**.
- Kung wala, **i-skip** lang — i-click ang **Next**.

#### Hakbang 8 — Data Privacy Consent (Required)

**Hindi pwedeng laktawan!** Bawat customer ay dapat may pirmadong Data Privacy form — ito ay batas sa Pilipinas (Data Privacy Act of 2012).

I-upload ang **front at back** ng pirmadong form.

#### Hakbang 9 — Other Documents (Optional)

Kung may dagdag na dokumento (Special Power of Attorney, birth certificate, business permit), i-upload dito.

Kung wala, i-click ang **Next**.

#### Hakbang 10 — Submit

May lalabas na **summary** ng lahat ng inilagay mo. Basahin nang mabuti.

- Kung may mali, i-click ang **Back** para ayusin.
- Kung tama lahat, i-click ang **Submit**.

I-save ng sistema ang customer at lahat ng dokumento. May lalabas na success message.

> **Kung nag-error?** Isulat ang error message at sabihin sa admin. Kadalasan: mabagal na internet o file na sobra ang laki.

### 3.3 Paghahanap ng Existing Customer

1. Sa nav bar, i-click ang **Customer Profiles**.
2. Lalabas ang listahan ng customers na inupload mo.
3. Sa **search box**, i-type ang anumang bahagi ng pangalan o account number.
4. I-click ang customer para makita ang accounts niya.

### 3.4 Pagtingin ng Documents ng Customer

1. I-click ang customer mula sa listahan.
2. I-click ang **View** button.
3. Lalabas ang full profile, accounts, at gallery ng lahat ng documents.
4. I-click ang anumang litrato para palakihin:
   - **Zoom in/out** — gamit ang `+` at `−` keys
   - **Galaw** — i-click at i-drag ang litrato
   - **Sunod/Nakaraan** — gamit ang arrow keys
   - **Sara** — pindutin ang `X` o `Esc` key

### 3.5 Pag-edit o Pagpalit ng Document

Kung malabo o mali ang inupload mo:
1. Buksan ang profile ng customer.
2. I-click ang **Edit** (o pencil icon).
3. Mag-upload ng bagong front o back para palitan ang luma.
4. I-click ang **Save**.

Mai-record sa audit log na pinalitan mo.

### 3.6 Pagdagdag ng Bagong Account sa Existing Customer

Kung dating customer ang nagbukas ng **bagong account**:
1. Buksan ang profile niya.
2. I-click ang **Add Account**.
3. Sundan ang wizard — number, date opened, risk level, status.
4. I-upload ang mga bagong dokumento.
5. I-click ang **Submit**.

### 3.7 Thumbmark Search

Kung may customer na hindi maalala ang account number o pangalan niya, pwedeng hanapin sa **thumbprint** niya.

1. Sa **Customer Profiles**, i-click ang **Thumbmark Search**.
2. I-press ng customer ang hinlalaki sa fingerprint reader (kung meron sa branch ninyo) — o i-scan ang fingerprint.
3. Hahanapin ng sistema kung may match.

> **Mahalaga:** Gumagana lang ito kung may **malinaw na thumbmark** sa orihinal na signature card. Hindi lahat ng signature card may thumbmark. Kung walang nakuha, gamitin na lang ang regular na search by name.

### 3.8 Profile Mo

1. I-click ang pangalan mo sa **kanang itaas**.
2. I-click ang **My Profile**.

Makikita mo: pangalan, email, role, branch, kailan huling nag-sign in, at kung naka-on ang 2FA. Pwede mo ring palitan ang password mo dito.

---

## Bahagi 4 — Cashier Guide

Ang trabaho mo ay **mabilis na hanapin ang impormasyon ng customer** sa teller window. **Pwede kang tumingin pero hindi pwedeng mag-upload o mag-edit** — gawain iyon ng Banking Officer.

### 4.1 Home Screen

May tatlong button sa nav bar:
- **Dashboard** — summary ng branch
- **Customers** — listahan ng customers sa branch ninyo
- **Documents** — mga dokumento sa branch

### 4.2 Dashboard

Ipapakita: kabuuang customers, signature cards, documents, at uploads ngayong araw.

### 4.3 Paghahanap ng Customer

1. I-click ang **Customers**.
2. Sa **search box**, i-type ang pangalan o account number.
3. I-click para makita ang profile at documents.

### 4.4 Pagtingin ng Documents

1. I-click ang pangalan ng customer.
2. I-click ang anumang document image para palakihin.
3. Gamitin ang `+`/`−` para mag-zoom; arrow keys para sa next/previous; `Esc` para isara.

### 4.5 Bakit Walang Upload Button?

Sadyang ginawa ito:
- Ang pag-upload at pag-edit ay trabaho ng **Banking Officer** lang. Para malinaw ang trabaho at iwas-mali.
- Ang trabaho mo ay **mag-verify** — tingnan ang signature card at kumpirmahin na tama ang customer bago mo i-process ang transaksyon.

Kung may makitang mali (mali na image, kulang na document), sabihin sa Banking Officer.

### 4.6 Profile

I-click ang pangalan mo sa kanang itaas → **Profile**.

---

## Bahagi 5 — Branch Manager Guide

Ikaw ang nangangasiwa sa branch. Tinutulungan ka ng sistema na malaman kung ano ang nangyayari.

### 5.1 Home Screen

May tatlong button:
- **Dashboard** — summary ng branch ninyo
- **Customers** — lahat ng customers sa branch
- **Documents** — lahat ng documents sa branch

### 5.2 Dashboard

Ipapakita:
- **Total customers** sa branch ninyo
- **Signature cards** na naka-file
- **Total documents**
- **Uploads ngayong araw** — kung gaano kabusy ang staff ninyo

Auto-update ito habang nag-uupload ang team mo.

### 5.3 Pagbrowse ng Customers

1. I-click ang **Customers**.
2. Lalabas ang lahat ng customers sa branch.
3. **Search box** para sa pangalan o account number.
4. Gamitin ang **filters** para mag-filter ayon sa risk level, status, o type.
5. I-click ang customer para makita ang full profile.

### 5.4 Documents

I-click ang **Documents** para makita ang mga uploaded documents sa branch.

### 5.5 Profile

Top right → **Profile** → mag-edit o magpalit ng password.

---

## Bahagi 6 — Compliance Auditor Guide

Tinitiyak mo na sumusunod ang banko sa lahat ng batas — BSP, Data Privacy Act, anti-money-laundering. Nakikita mo ang **lahat ng nangyayari sa lahat ng 11 branches**.

### 6.1 Home Screen

- **Dashboard** — bank-wide numbers
- **Audit Logs** — pinakamahalaga: record ng lahat ng aksyon
- **Customer Profiles** — pwede mong tingnan ang sinumang customer sa kahit anong branch

### 6.2 Dashboard

Total ng buong banko: customers, signature cards, documents, at uploads ngayon. Gamitin para tukuyin ang kakaibang pattern (halimbawa, biglang daan-daang upload sa isang branch).

### 6.3 Pagbasa ng Audit Logs

Ang audit log ay ang pinakamahalagang tool mo. **Lahat ng mahalagang aksyon ay nakatala dito** — automatic. **Hindi mo mababago o mabubura** ang entry — sadyang ganito para mapagkakatiwalaan bilang ebidensya.

1. I-click ang **Audit Logs**.
2. Lalabas ang listahan, mula bago hanggang luma. Bawat entry: **sino**, **anong ginawa**, **kailan**, **anong nagbago** (lumang value vs bagong value).
3. Gamitin ang **filters**:
   - **Date range** — halimbawa, "Oct 1 to Oct 31"
   - **By user** — partikular na staff
   - **By action** — login lang, o customer change lang
   - **By category** — Login Activity, Customer Records, Staff Accounts, Security, System
4. I-click ang anumang entry para makita ang full details.

> **Tip para sa imbestigasyon:** Kung may complaint ang customer, hanapin ang pangalan niya sa audit log. Makikita mo ang lahat ng pagbabago sa profile niya, sino ang gumawa, kailan. Ito ang ebidensya mo.

### 6.4 Pagtingin ng Customer sa Anumang Branch

1. I-click ang **Customer Profiles**.
2. Maghanap ayon sa pangalan, account number, o branch.
3. I-click ang customer para makita ang full profile.

Gamitin para mag-spot-check kung tama ang ginagawa ng mga branch — malinaw ang litrato, kompleto ang Data Privacy form, tama ang risk level.

### 6.5 Profile

Top right → **Profile** → palitan ang password kung kailangan.

---

## Bahagi 7 — System Administrator Guide

Ikaw ang nag-aasikaso ng sistema mismo — user accounts, roles, settings, branches.

### 7.1 Home Screen

May **sidebar sa kaliwa** ng screen, hindi top bar. Mga menu:
- **Dashboard** — bank-wide summary
- **Users** — gumawa, mag-edit ng staff accounts
- **Roles & Permissions** — kontrolin kung ano ang kayang gawin ng bawat role
- **Audit Logs** — pareho sa view ng compliance auditor
- **Customer Profiles** — anumang customer sa anumang branch
- **Branches** — pamahalaan ang listahan ng branches
- **Data Management** — utility tools
- **Settings** — system-wide rules

### 7.2 Pag-Create ng Bagong User

Kapag may bagong staff:
1. **Sidebar → Users**.
2. I-click ang **+ Add User** o **Create User** button.
3. Ipasok: **First name, Last name, Username, Email, Branch, Role** (Admin, Manager, User, Cashier, Compliance Auditor).
4. I-on ang **2FA** kung sensitive ang role.
5. I-click ang **Save**.

> **MAHALAGA — ang temporary password:**
> Automatic na **`abc_123`** ang ilalagay ng sistema bilang password ng bagong user. Sabihin ito sa staff. Pipilitin siya ng sistema na palitan sa unang pag-sign in.

### 7.3 Edit, Deactivate, Reactivate

- **Edit:** click sa user → **Edit** → palit → **Save**.
- **Deactivate:** kung nag-leave o nag-resign — hindi na siya makaka-sign in, pero nasa records pa.
- **Reactivate:** kung nagbalik — pwede ulit mag-sign in.

### 7.4 Reset ng Password

Kung nakalimutan ng staff ang password:
1. **Users** → hanapin → click → **Reset Password**.
2. Ipapakita ng sistema ang temporary password (`abc_123`).
3. **Sabihin nang harap-harapan** sa staff. Wag i-text o i-email.

### 7.5 Pag-unlock ng Locked Account

Kung **5x nagkamali** at na-lock:
1. **Users** → hanapin → click → **Unlock Account**.

### 7.6 Roles & Permissions

5 roles ang banko: **Admin, Manager, User (Banking Officer), Cashier, Compliance Auditor.**

1. **Sidebar → Roles & Permissions**.
2. May grid: roles sa itaas, permissions sa gilid. **Checkmark** = pwede; walang check = bawal.
3. Click ang kahon para baguhin → **Save**.

> **Babala:** Ingat dito! Kung mawalan ng permission ang isang role, hindi na nila magagawa ang trabaho. **I-test muna sa isang user** bago i-apply sa lahat.

### 7.7 Audit Logs

Pareho sa Bahagi 6.3. **Pwede ka ring mag-export** ng logs sa file para sa archive o BSP.

### 7.8 System Settings

**Sidebar → Settings.** Pangunahing settings:
- **Session Timeout** — ilang minuto bago ma-auto-sign out (default: 10)
- **Token Expiration** — gaano katagal valid ang sign-in (default: 30 min)
- **Maximum Login Attempts** — ilang mali bago ma-lock (default: 5)
- **Password Expiry** — i-on kung gusto mong mag-expire ang password sa ilang araw
- **Password Expiry Days** — ilang araw bago mag-expire (default: 90)

Palit → **Save** → magaganap sa lahat.

> **Tip:** Kausapin ang Compliance Officer bago mo palitan ang security settings. May minimum standards ang BSP.

### 7.9 Branches

11 branches ang banko (Head Office, Main Office, Jasaan, Salay, CDO, Maramag, Gingoog BLU, Camiguin BLU, Butuan BLU, Kibawe BLU, Claveria BLU). Idagdag, i-edit, o palitan ang parent branch dito.

### 7.10 Data Management

Mga utility tools — bulk import/export, archive ng lumang records, cleanup ng duplicates. **Mag-ingat** — maraming records ang apektado ng aksyon dito. Basahin ang confirmation message bago mag-click.

### 7.11 Profile

Top right → **Profile** → magpalit ng password.

---

## Bahagi 8 — Mga Karaniwang Gawain *(Kasagarang Buhaton)*

### 8.1 Pagpalit ng Password

1. Click pangalan sa kanang itaas → **Profile**.
2. Hanapin ang **Change Password** section.
3. **Current password** sa unang kahon.
4. **Bagong password** sa pangalawa.
5. **Bagong password ulit** sa pangatlo.
6. **Change Password.**

### 8.2 Pagbago ng Profile Photo

1. Buksan ang Profile.
2. I-click ang litrato (o ang walang laman na bilog).
3. Pumili ng litrato sa computer.
4. **Save.**

### 8.3 Pag-on ng 2FA Para Sa Sarili

1. Profile → **Two-Factor Authentication** section → **Enable**.
2. Sundin ang instructions — kadalasan, mag-scan ng QR code gamit ang phone.
3. I-type ang 6-digit code mula sa phone para kumpirmahin.

> **Lubos na inirerekomenda** para sa Admin, Manager, at Compliance Auditor.

### 8.4 Kapag Tila Naka-Freeze ang Sistema

Sundan ang mga hakbang:
1. **Maghintay ng 10 segundo** — minsan mabagal lang ang internet.
2. **I-refresh** ang page (F5 key).
3. **Mag-sign out at sign in ulit.**
4. **Subukan ang ibang browser** (Chrome kung Edge, o vice versa).
5. **I-restart ang computer.**
6. **Kung walang gumana**, sabihin sa admin. Magdala ng:
   - Ano ang ginagawa mo nang nag-error
   - Ano ang error message

---

## Bahagi 9 — Mga Salita na Makikita Mo

| Salita | Simpleng Kahulugan |
|---|---|
| **Account Holder** | Tao na may-ari ng account. Joint = higit sa isa. |
| **Active** | Status na ginagamit pa ang account. |
| **Audit Log** | Listahan ng lahat ng mahalagang aksyon sa sistema. Hindi mababago. |
| **Banking Officer** | Role na "user" — siya ang nag-uupload ng signature card. |
| **BLU** | Branch Lite Unit — maliit na satellite branch sa ilalim ng mas malaking mother branch. |
| **BSP** | Bangko Sentral ng Pilipinas — ang nagbibigay ng patakaran sa lahat ng bangko. |
| **Closed** | Status na sarado na ang account. |
| **Corporate** | Account ng kumpanya o organisasyon, hindi tao. |
| **Customer** | Tao o negosyo na may account sa bangko. |
| **Data Privacy Form** | Pirmadong papel kung saan pumapayag ang customer na imbakin ng banko ang impormasyon niya. **Required ng batas.** |
| **Dormant** | Account na matagal nang hindi ginagamit. |
| **Escheat** | Account na inabandona; pwedeng ibigay sa gobyerno. |
| **High Risk** | Customer na kailangan ng dagdag pansin sa compliance — halimbawa, malalaki o di-pangkaraniwang transaksyon. |
| **ITF (In Trust For)** | Joint account kung saan may isang tao na nag-hahawak ng pera para sa iba (halimbawa, magulang para sa anak). |
| **Joint** | Account na shared ng dalawa o higit pang tao. |
| **Low Risk** | Karaniwang customer. Karamihan ng customer, low risk. |
| **Medium Risk** | Customer na kailangan ng kaunting bantay. |
| **NAIS** | National Account Information Sheet — form na may basic ID at info ng customer. |
| **Non-ITF** | Joint account na magkapantay ang lahat ng holder. |
| **Reactivated** | Account na dating dormant, ginagamit na ulit. |
| **Regular** | Karaniwang individual account, isang tao lang. |
| **Risk Level** | Gaano karaming pansin kailangan ng customer: Low, Medium, o High. |
| **Role** | Klase ng staff: Admin, Manager, User (Banking Officer), Cashier, Compliance Auditor. |
| **Session** | Oras na naka-sign in ka. Pagkatapos ng 10 idle minutes, matatapos. |
| **Sign In / Sign Out** | Dating "Login / Logout." |
| **Signature Card** | Papel kung saan pumirma ang customer pagbukas ng account. |
| **Sigcard** | Maikling tawag sa "signature card." |
| **Temporary Password** | Pasimulang password (`abc_123`) para sa bagong user. Dapat palitan sa unang pag-sign in. |
| **Token** | Hindi nakikitang "ticket" na ibinibigay ng sistema kapag nag-sign in ka. Mag-e-expire after 30 min. |
| **2FA / Two-Factor Authentication** | Dagdag na security — kailangan ng 6-digit code mula sa phone bukod sa password. |

---

## Bahagi 10 — Sino ang Tatawagan Mo Para Sa Tulong

### Hakbang 1 — Subukan Muna ang Madaling Solusyon
- **I-refresh** ang page (F5)
- **Mag-sign out at sign in ulit**
- **Tingnan ang internet connection**

Kadalasan, naaayos na ang problema ng tatlong hakbang na ito.

### Hakbang 2 — Magtanong sa Mga Kasamahan
- May mas matagal nang gumagamit. Tanungin sila.
- Ang **branch manager** ay marunong sa karamihan ng pang-araw-araw na tanong.

### Hakbang 3 — Sabihin sa System Administrator

Para sa mga ito:
- **Hindi ako maka-sign in / na-lock ako**
- **Nakalimutan ko ang password**
- **Lalabas ang "Permission denied"**
- **May kakaibang error at hindi naayos sa madaling solusyon**
- **Sa palagay ko, ginamit ng iba ang account ko**

### Mga Bagay na **HINDI** Mo Dapat Gawin

- **Wag i-share ang password mo** — kahit kanino, kahit pa sabi galing sa IT. Hindi tatanungin ng tunay na IT ang password mo.
- **Wag pumayag na mag-sign in ang iba sa account mo.** Kung may magawa silang mali, ang pangalan mo ang lalabas sa audit log.
- **Wag sumulat ng password sa sticky note** sa monitor o sa ilalim ng keyboard.
- **Wag i-click ang "Remember Me" sa public computer.**
- **Wag i-share ang impormasyon ng customer** sa labas ng banko, kahit pa kaibigan o kapamilya.

### Para sa Mga Detalyadong Teknikal o Compliance Tanong

Itong gabay na ito ay para sa pang-araw-araw na paggamit. Kung kailangan mo ng mas detalyadong impormasyon tungkol sa BSP regulations, technical setup, o detalyadong audit procedures, basahin ang **`SIGCARD_SYSTEM_MANUAL.md`** — opisyal na full reference manual ng banko.

---

*Salamat sa paggamit ng DIGICUR (Digital Customer Record System)! Sa pagsunod sa gabay na ito at pag-iingat sa password at customer data, tumutulong ka na mapanatiling **ligtas, mapagkakatiwalaan, at BSP-compliant** ang RBT Bank.* 

*— RBT Bank IT Team*

---

> **Reminder:** Para sa karagdagang paliwanag at screenshots, basahin ang opisyal na English version: **`SIGCARD_USER_GUIDE.md`** sa parehong folder.
