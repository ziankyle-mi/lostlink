import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase configuration in environment.");
  process.exit(1);
}

const seedPassword = process.env.SEED_PASSWORD;
if (!seedPassword || seedPassword.length < 12) {
  console.error(
    "SEED_PASSWORD is required (min 12 characters). This script refuses to use a hardcoded password.",
  );
  process.exit(1);
}
if (/^dlsau(pass|password)/i.test(seedPassword)) {
  console.error("Refusing the old universal demo password. Choose a new one.");
  process.exit(1);
}
const confirmEmails = process.env.SEED_CONFIRM_EMAILS === "true";

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

// Realistic Filipino student & faculty names per program (10 per program)
const PROGRAM_ACCOUNTS = [
  // 1. CAST - BS Computer Science (BSCS)
  {
    program: "BSCS",
    college: "CAST",
    users: [
      { name: "Rene Baterbonia", email: "rene.baterbonia@dlsau.edu.ph", id: "2024-10144", isFaculty: false },
      { name: "Christian Josh De Vera", email: "christian.devera@dlsau.edu.ph", id: "2023-10219", isFaculty: false },
      { name: "Ezekiel Dave Soriano", email: "ezekiel.soriano@dlsau.edu.ph", id: "2024-10332", isFaculty: false },
      { name: "Kyla Nicole Manalo", email: "kyla.manalo@dlsau.edu.ph", id: "2023-10450", isFaculty: false },
      { name: "Angelo Miguel Ramos", email: "angelo.ramos@dlsau.edu.ph", id: "2022-10512", isFaculty: false },
      { name: "Justin Lee Garcia", email: "justin.garcia@dlsau.edu.ph", id: "2024-10688", isFaculty: false },
      { name: "Patricia Mae Valenzuela", email: "patricia.valenzuela@dlsau.edu.ph", id: "2023-10701", isFaculty: false },
      { name: "Joshua Kyle Alcantara", email: "joshua.alcantara@dlsau.edu.ph", id: "2022-10822", isFaculty: false },
      { name: "Nathaniel James Lim", email: "nathaniel.lim@dlsau.edu.ph", id: "2024-10905", isFaculty: false },
      { name: "Engr. Danilo Corpuz", email: "danilo.corpuz@dlsau.edu.ph", id: "2018-F102", isFaculty: true },
    ],
  },
  // 2. CAST - BS Computer Engineering (BSCpE)
  {
    program: "BSCpE",
    college: "CAST",
    users: [
      { name: "Vince Carlo Bautista", email: "vince.bautista@dlsau.edu.ph", id: "2023-11021", isFaculty: false },
      { name: "Jericho Manuel Cruz", email: "jericho.cruz@dlsau.edu.ph", id: "2024-11145", isFaculty: false },
      { name: "Alyssa Marie Tan", email: "alyssa.tan@dlsau.edu.ph", id: "2022-11267", isFaculty: false },
      { name: "Dominic Kyle Pineda", email: "dominic.pineda@dlsau.edu.ph", id: "2024-11389", isFaculty: false },
      { name: "Samantha Nicole Perez", email: "samantha.perez@dlsau.edu.ph", id: "2023-11402", isFaculty: false },
      { name: "Karl Matthew Flores", email: "karl.flores@dlsau.edu.ph", id: "2022-11516", isFaculty: false },
      { name: "John Patrick Santos", email: "johnpatrick.santos@dlsau.edu.ph", id: "2024-11634", isFaculty: false },
      { name: "Rhea Camille Ocampo", email: "rhea.ocampo@dlsau.edu.ph", id: "2023-11755", isFaculty: false },
      { name: "Francis Gabriel Diaz", email: "francis.diaz@dlsau.edu.ph", id: "2024-11890", isFaculty: false },
      { name: "Engr. Roberto San Jose", email: "roberto.sanjose@dlsau.edu.ph", id: "2017-F118", isFaculty: true },
    ],
  },
  // 3. CAST - BA Psychology (AB Psych)
  {
    program: "AB Psych",
    college: "CAST",
    users: [
      { name: "Bianca Nicole Reyes", email: "bianca.reyes@dlsau.edu.ph", id: "2023-12014", isFaculty: false },
      { name: "Hannah Sofia David", email: "hannah.david@dlsau.edu.ph", id: "2024-12150", isFaculty: false },
      { name: "Chloe Danielle Aguilar", email: "chloe.aguilar@dlsau.edu.ph", id: "2022-12280", isFaculty: false },
      { name: "Marcus Elijah Rivera", email: "marcus.rivera@dlsau.edu.ph", id: "2024-12391", isFaculty: false },
      { name: "Sophia Gail Mercado", email: "sophia.mercado@dlsau.edu.ph", id: "2023-12415", isFaculty: false },
      { name: "Tristan Joaquin Torres", email: "tristan.torres@dlsau.edu.ph", id: "2022-12530", isFaculty: false },
      { name: "Bea Clarisse Navarro", email: "bea.navarro@dlsau.edu.ph", id: "2024-12644", isFaculty: false },
      { name: "Janelle Marie Castillo", email: "janelle.castillo@dlsau.edu.ph", id: "2023-12782", isFaculty: false },
      { name: "Rafael Luis Gonzales", email: "rafael.gonzales@dlsau.edu.ph", id: "2024-12899", isFaculty: false },
      { name: "Prof. Carmela De Guzman", email: "carmela.deguzman@dlsau.edu.ph", id: "2019-F135", isFaculty: true },
    ],
  },
  // 4. CVMAS - Doctor of Veterinary Medicine (DVM)
  {
    program: "DVM",
    college: "CVMAS",
    users: [
      { name: "Ako Eto", email: "ako.eto@dlsau.edu.ph", id: "2023-01892", isFaculty: false },
      { name: "Gabriel Anton Villanueva", email: "gabriel.villanueva@dlsau.edu.ph", id: "2022-13045", isFaculty: false },
      { name: "Maria Kristina Salcedo", email: "maria.salcedo@dlsau.edu.ph", id: "2024-13180", isFaculty: false },
      { name: "Enrico Paolo Pascual", email: "enrico.pascual@dlsau.edu.ph", id: "2021-13295", isFaculty: false },
      { name: "Andrea Nicole Fernandez", email: "andrea.fernandez@dlsau.edu.ph", id: "2023-13410", isFaculty: false },
      { name: "Miguel Antonio Roxas", email: "miguel.roxas@dlsau.edu.ph", id: "2024-13525", isFaculty: false },
      { name: "Celine Bernadette Yu", email: "celine.yu@dlsau.edu.ph", id: "2022-13640", isFaculty: false },
      { name: "Kevin Carl Dizon", email: "kevin.dizon@dlsau.edu.ph", id: "2023-13760", isFaculty: false },
      { name: "Danielle Marie Sy", email: "danielle.sy@dlsau.edu.ph", id: "2024-13880", isFaculty: false },
      { name: "Dr. Eduardo Macaraeg, DVM", email: "eduardo.macaraeg@dlsau.edu.ph", id: "2015-F150", isFaculty: true },
    ],
  },
  // 5. CVMAS - BS Agriculture (BSA - Salikneta Farm)
  {
    program: "BSA",
    college: "CVMAS",
    users: [
      { name: "Marcelino Zapanta", email: "marcelino.zapanta@dlsau.edu.ph", id: "2024-03221", isFaculty: false },
      { name: "Roderick Allan Gomez", email: "roderick.gomez@dlsau.edu.ph", id: "2023-14022", isFaculty: false },
      { name: "Maria Clarisse Santos", email: "clarisse.santos@dlsau.edu.ph", id: "2024-14140", isFaculty: false },
      { name: "Benigno Jose Tolentino", email: "benigno.tolentino@dlsau.edu.ph", id: "2022-14265", isFaculty: false },
      { name: "Aileen Joy Dela Cruz", email: "aileen.delacruz@dlsau.edu.ph", id: "2023-14380", isFaculty: false },
      { name: "Crisanto David Morales", email: "crisanto.morales@dlsau.edu.ph", id: "2024-14495", isFaculty: false },
      { name: "Luzviminda Ramos", email: "luzviminda.ramos@dlsau.edu.ph", id: "2022-14510", isFaculty: false },
      { name: "Rommel Jay Balagtas", email: "rommel.balagtas@dlsau.edu.ph", id: "2023-14630", isFaculty: false },
      { name: "Maricris Angela Aquino", email: "maricris.aquino@dlsau.edu.ph", id: "2024-14750", isFaculty: false },
      { name: "Dr. Artemio Magat", email: "artemio.magat@dlsau.edu.ph", id: "2016-F162", isFaculty: true },
    ],
  },
  // 6. CVMAS - BS Food Technology (BSFT)
  {
    program: "BSFT",
    college: "CVMAS",
    users: [
      { name: "Jacob Robles", email: "jacob.robles@dlsau.edu.ph", id: "2023-04118", isFaculty: false },
      { name: "Katrina Isabel Bernardo", email: "katrina.bernardo@dlsau.edu.ph", id: "2024-15012", isFaculty: false },
      { name: "Leandro Jose Carreon", email: "leandro.carreon@dlsau.edu.ph", id: "2022-15135", isFaculty: false },
      { name: "Charmaine Rose Del Rosario", email: "charmaine.delrosario@dlsau.edu.ph", id: "2024-15250", isFaculty: false },
      { name: "Renato Carlo Mendoza", email: "renato.mendoza@dlsau.edu.ph", id: "2023-15368", isFaculty: false },
      { name: "Gillian Marie Go", email: "gillian.go@dlsau.edu.ph", id: "2022-15480", isFaculty: false },
      { name: "Dexter Allan Beltran", email: "dexter.beltran@dlsau.edu.ph", id: "2024-15595", isFaculty: false },
      { name: "Joanna Paula Lim", email: "joanna.lim@dlsau.edu.ph", id: "2023-15615", isFaculty: false },
      { name: "Adrian Paul Sunga", email: "adrian.sunga@dlsau.edu.ph", id: "2024-15730", isFaculty: false },
      { name: "Prof. Evangeline Sison", email: "evangeline.sison@dlsau.edu.ph", id: "2018-F175", isFaculty: true },
    ],
  },
  // 7. CBMA - BS Accountancy (BSA-Act)
  {
    program: "BSA-Act",
    college: "CBMA",
    users: [
      { name: "Paulo Mendoza", email: "paulo.mendoza@dlsau.edu.ph", id: "2024-00214", isFaculty: false },
      { name: "Mary Grace Arriola", email: "marygrace.arriola@dlsau.edu.ph", id: "2023-16015", isFaculty: false },
      { name: "Carl Vincent Ong", email: "carl.ong@dlsau.edu.ph", id: "2024-16130", isFaculty: false },
      { name: "Rowena Joy Estacio", email: "rowena.estacio@dlsau.edu.ph", id: "2022-16245", isFaculty: false },
      { name: "Jerome Matthew Chua", email: "jerome.chua@dlsau.edu.ph", id: "2024-16360", isFaculty: false },
      { name: "Kristine Mae Legaspi", email: "kristine.legaspi@dlsau.edu.ph", id: "2023-16475", isFaculty: false },
      { name: "Alvin Joseph Co", email: "alvin.co@dlsau.edu.ph", id: "2022-16590", isFaculty: false },
      { name: "Daphne Camille Yap", email: "daphne.yap@dlsau.edu.ph", id: "2024-16610", isFaculty: false },
      { name: "Neil Patrick Serrano", email: "neil.serrano@dlsau.edu.ph", id: "2023-16725", isFaculty: false },
      { name: "Prof. Ricardo Buenaventura, CPA", email: "ricardo.buenaventura@dlsau.edu.ph", id: "2016-F188", isFaculty: true },
    ],
  },
  // 8. CBMA - BSBA Financial Management (BSBA-FM)
  {
    program: "BSBA-FM",
    college: "CBMA",
    users: [
      { name: "Juan Carlo Fernandez", email: "juancarlo.fernandez@dlsau.edu.ph", id: "2023-17010", isFaculty: false },
      { name: "Christine Angela Villar", email: "christine.villar@dlsau.edu.ph", id: "2024-17125", isFaculty: false },
      { name: "Daryl Scott Henson", email: "daryl.henson@dlsau.edu.ph", id: "2022-17240", isFaculty: false },
      { name: "Monica Denise Cabrera", email: "monica.cabrera@dlsau.edu.ph", id: "2024-17355", isFaculty: false },
      { name: "Raymund Paul David", email: "raymund.david@dlsau.edu.ph", id: "2023-17470", isFaculty: false },
      { name: "Shiela Marie Gonzales", email: "shiela.gonzales@dlsau.edu.ph", id: "2022-17585", isFaculty: false },
      { name: "Jonathan Carl Uy", email: "jonathan.uy@dlsau.edu.ph", id: "2024-17600", isFaculty: false },
      { name: "Kirsten Louise Tan", email: "kirsten.tan@dlsau.edu.ph", id: "2023-17715", isFaculty: false },
      { name: "Mark Anthony Banal", email: "mark.banal@dlsau.edu.ph", id: "2024-17830", isFaculty: false },
      { name: "Prof. Marites Alcantara", email: "marites.alcantara@dlsau.edu.ph", id: "2017-F199", isFaculty: true },
    ],
  },
  // 9. CBMA - BSBA Marketing Management (BSBA-MM)
  {
    program: "BSBA-MM",
    college: "CBMA",
    users: [
      { name: "Christian Paul Zamora", email: "christian.zamora@dlsau.edu.ph", id: "2024-18012", isFaculty: false },
      { name: "Stephanie Gail Ofrasio", email: "stephanie.ofrasio@dlsau.edu.ph", id: "2023-18130", isFaculty: false },
      { name: "Marco Luis Evangelista", email: "marco.evangelista@dlsau.edu.ph", id: "2022-18245", isFaculty: false },
      { name: "Janelle Therese Puno", email: "janelle.puno@dlsau.edu.ph", id: "2024-18360", isFaculty: false },
      { name: "Timothy James Salazar", email: "timothy.salazar@dlsau.edu.ph", id: "2023-18475", isFaculty: false },
      { name: "Roxanne Faye Miranda", email: "roxanne.miranda@dlsau.edu.ph", id: "2022-18590", isFaculty: false },
      { name: "Elvin John Quinto", email: "elvin.quinto@dlsau.edu.ph", id: "2024-18605", isFaculty: false },
      { name: "Celine Joyce Tiongson", email: "celine.tiongson@dlsau.edu.ph", id: "2023-18720", isFaculty: false },
      { name: "Patrick Sean Vergara", email: "patrick.vergara@dlsau.edu.ph", id: "2024-18835", isFaculty: false },
      { name: "Prof. Noel Manalastas", email: "noel.manalastas@dlsau.edu.ph", id: "2018-F205", isFaculty: true },
    ],
  },
  // 10. CBMA - BS Hospitality Management (BSHM)
  {
    program: "BSHM",
    college: "CBMA",
    users: [
      { name: "Alyssa Marie Valdez", email: "alyssa.valdez@dlsau.edu.ph", id: "2023-19015", isFaculty: false },
      { name: "Gerard Lorenzo Santos", email: "gerard.santos@dlsau.edu.ph", id: "2024-19130", isFaculty: false },
      { name: "Francine Nicole Lim", email: "francine.lim@dlsau.edu.ph", id: "2022-19245", isFaculty: false },
      { name: "Jayson Mark Bernardo", email: "jayson.bernardo@dlsau.edu.ph", id: "2024-19360", isFaculty: false },
      { name: "Ella Mae Concepcion", email: "ella.concepcion@dlsau.edu.ph", id: "2023-19475", isFaculty: false },
      { name: "Russell Dave Ignacio", email: "russell.ignacio@dlsau.edu.ph", id: "2022-19590", isFaculty: false },
      { name: "Kayla Denise Roxas", email: "kayla.roxas@dlsau.edu.ph", id: "2024-19605", isFaculty: false },
      { name: "Bryan Christopher Sy", email: "bryan.sy@dlsau.edu.ph", id: "2023-19720", isFaculty: false },
      { name: "Angelica Faith Dizon", email: "angelica.dizon@dlsau.edu.ph", id: "2024-19835", isFaculty: false },
      { name: "Chef Ronald Villanueva", email: "ronald.villanueva@dlsau.edu.ph", id: "2017-F218", isFaculty: true },
    ],
  },
  // 11. CBMA - BS Tourism Management (BSTM)
  {
    program: "BSTM",
    college: "CBMA",
    users: [
      { name: "Kristine Joy Bernardo", email: "kristine.bernardo@dlsau.edu.ph", id: "2024-20010", isFaculty: false },
      { name: "Julian Gabriel Torres", email: "julian.torres@dlsau.edu.ph", id: "2023-20125", isFaculty: false },
      { name: "Marielle Anne Pascual", email: "marielle.pascual@dlsau.edu.ph", id: "2022-20240", isFaculty: false },
      { name: "Cedric Paul David", email: "cedric.david@dlsau.edu.ph", id: "2024-20355", isFaculty: false },
      { name: "Therese Nicole Castro", email: "therese.castro@dlsau.edu.ph", id: "2023-20470", isFaculty: false },
      { name: "Adrian Miguel Cortez", email: "adrian.cortez@dlsau.edu.ph", id: "2022-20585", isFaculty: false },
      { name: "Camille Diane Flores", email: "camille.flores@dlsau.edu.ph", id: "2024-20600", isFaculty: false },
      { name: "Joshua Dave Macaraeg", email: "joshua.macaraeg@dlsau.edu.ph", id: "2023-20715", isFaculty: false },
      { name: "Rachel Marie Alcantara", email: "rachel.alcantara@dlsau.edu.ph", id: "2024-20830", isFaculty: false },
      { name: "Prof. Melinda Soriano", email: "melinda.soriano@dlsau.edu.ph", id: "2019-F225", isFaculty: true },
    ],
  },
  // 12. COED - Bachelor in Elementary Education (BEEd)
  {
    program: "BEEd",
    college: "COED",
    users: [
      { name: "Princess Joy Salonga", email: "princess.salonga@dlsau.edu.ph", id: "2023-21015", isFaculty: false },
      { name: "Joshua Miguel Aranas", email: "joshua.aranas@dlsau.edu.ph", id: "2024-21130", isFaculty: false },
      { name: "Katrina Elaine Morales", email: "katrina.morales@dlsau.edu.ph", id: "2022-21245", isFaculty: false },
      { name: "John David Esguerra", email: "john.esguerra@dlsau.edu.ph", id: "2024-21360", isFaculty: false },
      { name: "Maria Lourdes Santos", email: "marialourdes.santos@dlsau.edu.ph", id: "2023-21475", isFaculty: false },
      { name: "Alfonso Rafael Cruz", email: "alfonso.cruz@dlsau.edu.ph", id: "2022-21590", isFaculty: false },
      { name: "Clarissa Anne Reyes", email: "clarissa.reyes@dlsau.edu.ph", id: "2024-21605", isFaculty: false },
      { name: "Manuel Paulo Diaz", email: "manuel.diaz@dlsau.edu.ph", id: "2023-21720", isFaculty: false },
      { name: "Dianne Rose Guinto", email: "dianne.guinto@dlsau.edu.ph", id: "2024-21835", isFaculty: false },
      { name: "Dr. Alicia Panganiban", email: "alicia.panganiban@dlsau.edu.ph", id: "2015-F238", isFaculty: true },
    ],
  },
  // 13. COED - Bachelor in Secondary Education (BSEd)
  {
    program: "BSEd",
    college: "COED",
    users: [
      { name: "Geronimo David", email: "geronimo.david@dlsau.edu.ph", id: "2023-22014", isFaculty: false },
      { name: "Eunice Clarisse Yap", email: "eunice.yap@dlsau.edu.ph", id: "2024-22130", isFaculty: false },
      { name: "Jeremiah Luke Ramos", email: "jeremiah.ramos@dlsau.edu.ph", id: "2022-22245", isFaculty: false },
      { name: "Abigail Joy Villanueva", email: "abigail.villanueva@dlsau.edu.ph", id: "2024-22360", isFaculty: false },
      { name: "Vincent Edward Navarro", email: "vincent.navarro@dlsau.edu.ph", id: "2023-22475", isFaculty: false },
      { name: "Stephanie Marie Castro", email: "stephanie.castro@dlsau.edu.ph", id: "2022-22590", isFaculty: false },
      { name: "Renz Carlo Mendoza", email: "renz.mendoza@dlsau.edu.ph", id: "2024-22605", isFaculty: false },
      { name: "Kyla Jean Tolentino", email: "kyla.tolentino@dlsau.edu.ph", id: "2023-22720", isFaculty: false },
      { name: "Marc Daniel Hernandez", email: "marc.hernandez@dlsau.edu.ph", id: "2024-22835", isFaculty: false },
      { name: "Prof. Lourdes Carandang", email: "lourdes.carandang@dlsau.edu.ph", id: "2016-F245", isFaculty: true },
    ],
  },
];

async function seed() {
  console.log("Starting DLSAU Campus Account seeding in Supabase...");

  // 1. Fetch existing profiles to avoid duplicate creation
  const { data: existingProfiles, error: fetchErr } = await supabase
    .from("profiles")
    .select("id, email, full_name");

  if (fetchErr) {
    console.error("Error checking existing profiles:", fetchErr);
    process.exit(1);
  }

  const existingEmailMap = new Map();
  (existingProfiles || []).forEach((p) => {
    existingEmailMap.set(p.email.toLowerCase().trim(), p.id);
  });

  console.log(`Found ${existingEmailMap.size} existing profiles in database.`);

  let createdCount = 0;
  let updatedCount = 0;

  for (const group of PROGRAM_ACCOUNTS) {
    for (const u of group.users) {
      const emailLower = u.email.toLowerCase().trim();
      const existingId = existingEmailMap.get(emailLower);

      if (existingId) {
        // Update user metadata and profile name if needed
        await supabase.auth.admin.updateUserById(existingId, {
          user_metadata: {
            full_name: u.name,
            program: group.program,
            college: group.college,
            student_id: u.id,
            is_faculty: u.isFaculty,
          },
        });

        await supabase
          .from("profiles")
          .update({ full_name: u.name, active: true })
          .eq("id", existingId);

        updatedCount++;
      } else {
        // Create new user in auth.users (triggers profile creation)
        const { data: authUser, error: createErr } = await supabase.auth.admin.createUser({
          email: emailLower,
          password: seedPassword,
          // Only auto-confirm when explicitly opted in. Production should invite
          // users and verify their DLSAU mailbox instead.
          email_confirm: confirmEmails,
          user_metadata: {
            full_name: u.name,
            program: group.program,
            college: group.college,
            student_id: u.id,
            is_faculty: u.isFaculty,
          },
        });

        if (createErr) {
          console.warn(`Could not create ${emailLower}:`, createErr.message);
        } else if (authUser?.user?.id) {
          // Ensure profile has proper full_name
          await supabase
            .from("profiles")
            .update({ full_name: u.name, role: "user", active: true, must_change_password: true })
            .eq("id", authUser.user.id);

          existingEmailMap.set(emailLower, authUser.user.id);
          createdCount++;
        }
      }
    }
  }

  console.log(`Seeding complete! Created: ${createdCount}, Updated: ${updatedCount}. Total DLSAU accounts now ready.`);
}

seed().catch((err) => {
  console.error("Fatal error during seeding:", err);
  process.exit(1);
});
