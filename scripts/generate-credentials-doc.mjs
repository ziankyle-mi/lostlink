import fs from "fs";

const PROGRAM_ACCOUNTS = [
  // 1. CAST - BS Computer Science (BSCS)
  {
    programCode: "BSCS",
    programName: "Bachelor of Science in Computer Science",
    collegeCode: "CAST",
    collegeName: "College of Arts, Sciences and Technology (CAST)",
    campus: "Victoneta Park (Main Campus) — Computer Science & AI Research Lab",
    users: [
      { name: "Rene Baterbonia", email: "rene.baterbonia@dlsau.edu.ph", id: "2024-10144", isFaculty: false, role: "Student" },
      { name: "Christian Josh De Vera", email: "christian.devera@dlsau.edu.ph", id: "2023-10219", isFaculty: false, role: "Student" },
      { name: "Ezekiel Dave Soriano", email: "ezekiel.soriano@dlsau.edu.ph", id: "2024-10332", isFaculty: false, role: "Student" },
      { name: "Kyla Nicole Manalo", email: "kyla.manalo@dlsau.edu.ph", id: "2023-10450", isFaculty: false, role: "Student" },
      { name: "Angelo Miguel Ramos", email: "angelo.ramos@dlsau.edu.ph", id: "2022-10512", isFaculty: false, role: "Student" },
      { name: "Justin Lee Garcia", email: "justin.garcia@dlsau.edu.ph", id: "2024-10688", isFaculty: false, role: "Student" },
      { name: "Patricia Mae Valenzuela", email: "patricia.valenzuela@dlsau.edu.ph", id: "2023-10701", isFaculty: false, role: "Student" },
      { name: "Joshua Kyle Alcantara", email: "joshua.alcantara@dlsau.edu.ph", id: "2022-10822", isFaculty: false, role: "Student" },
      { name: "Nathaniel James Lim", email: "nathaniel.lim@dlsau.edu.ph", id: "2024-10905", isFaculty: false, role: "Student" },
      { name: "Engr. Danilo Corpuz", email: "danilo.corpuz@dlsau.edu.ph", id: "2018-F102", isFaculty: true, role: "Faculty Member" },
    ],
  },
  // 2. CAST - BS Computer Engineering (BSCpE)
  {
    programCode: "BSCpE",
    programName: "Bachelor of Science in Computer Engineering",
    collegeCode: "CAST",
    collegeName: "College of Arts, Sciences and Technology (CAST)",
    campus: "Victoneta Park (Main Campus) — Engineering & Microelectronics Lab",
    users: [
      { name: "Vince Carlo Bautista", email: "vince.bautista@dlsau.edu.ph", id: "2023-11021", isFaculty: false, role: "Student" },
      { name: "Jericho Manuel Cruz", email: "jericho.cruz@dlsau.edu.ph", id: "2024-11145", isFaculty: false, role: "Student" },
      { name: "Alyssa Marie Tan", email: "alyssa.tan@dlsau.edu.ph", id: "2022-11267", isFaculty: false, role: "Student" },
      { name: "Dominic Kyle Pineda", email: "dominic.pineda@dlsau.edu.ph", id: "2024-11389", isFaculty: false, role: "Student" },
      { name: "Samantha Nicole Perez", email: "samantha.perez@dlsau.edu.ph", id: "2023-11402", isFaculty: false, role: "Student" },
      { name: "Karl Matthew Flores", email: "karl.flores@dlsau.edu.ph", id: "2022-11516", isFaculty: false, role: "Student" },
      { name: "John Patrick Santos", email: "johnpatrick.santos@dlsau.edu.ph", id: "2024-11634", isFaculty: false, role: "Student" },
      { name: "Rhea Camille Ocampo", email: "rhea.ocampo@dlsau.edu.ph", id: "2023-11755", isFaculty: false, role: "Student" },
      { name: "Francis Gabriel Diaz", email: "francis.diaz@dlsau.edu.ph", id: "2024-11890", isFaculty: false, role: "Student" },
      { name: "Engr. Roberto San Jose", email: "roberto.sanjose@dlsau.edu.ph", id: "2017-F118", isFaculty: true, role: "Faculty Member" },
    ],
  },
  // 3. CAST - BA Psychology (AB Psych)
  {
    programCode: "AB Psych",
    programName: "Bachelor of Arts in Psychology",
    collegeCode: "CAST",
    collegeName: "College of Arts, Sciences and Technology (CAST)",
    campus: "Victoneta Park (Main Campus) — Psychological Assessment & Testing Suite",
    users: [
      { name: "Bianca Nicole Reyes", email: "bianca.reyes@dlsau.edu.ph", id: "2023-12014", isFaculty: false, role: "Student" },
      { name: "Hannah Sofia David", email: "hannah.david@dlsau.edu.ph", id: "2024-12150", isFaculty: false, role: "Student" },
      { name: "Chloe Danielle Aguilar", email: "chloe.aguilar@dlsau.edu.ph", id: "2022-12280", isFaculty: false, role: "Student" },
      { name: "Marcus Elijah Rivera", email: "marcus.rivera@dlsau.edu.ph", id: "2024-12391", isFaculty: false, role: "Student" },
      { name: "Sophia Gail Mercado", email: "sophia.mercado@dlsau.edu.ph", id: "2023-12415", isFaculty: false, role: "Student" },
      { name: "Tristan Joaquin Torres", email: "tristan.torres@dlsau.edu.ph", id: "2022-12530", isFaculty: false, role: "Student" },
      { name: "Bea Clarisse Navarro", email: "bea.navarro@dlsau.edu.ph", id: "2024-12644", isFaculty: false, role: "Student" },
      { name: "Janelle Marie Castillo", email: "janelle.castillo@dlsau.edu.ph", id: "2023-12782", isFaculty: false, role: "Student" },
      { name: "Rafael Luis Gonzales", email: "rafael.gonzales@dlsau.edu.ph", id: "2024-12899", isFaculty: false, role: "Student" },
      { name: "Prof. Carmela De Guzman", email: "carmela.deguzman@dlsau.edu.ph", id: "2019-F135", isFaculty: true, role: "Faculty Member" },
    ],
  },
  // 4. CVMAS - Doctor of Veterinary Medicine (DVM)
  {
    programCode: "DVM",
    programName: "Doctor of Veterinary Medicine",
    collegeCode: "CVMAS",
    collegeName: "College of Veterinary Medicine and Agricultural Sciences (CVMAS)",
    campus: "Victoneta Park & VTH — Veterinary Teaching Hospital & Clinical Practice Suite",
    users: [
      { name: "Ako Eto", email: "ako.eto@dlsau.edu.ph", id: "2023-01892", isFaculty: false, role: "Student" },
      { name: "Gabriel Anton Villanueva", email: "gabriel.villanueva@dlsau.edu.ph", id: "2022-13045", isFaculty: false, role: "Student" },
      { name: "Maria Kristina Salcedo", email: "maria.salcedo@dlsau.edu.ph", id: "2024-13180", isFaculty: false, role: "Student" },
      { name: "Enrico Paolo Pascual", email: "enrico.pascual@dlsau.edu.ph", id: "2021-13295", isFaculty: false, role: "Student" },
      { name: "Andrea Nicole Fernandez", email: "andrea.fernandez@dlsau.edu.ph", id: "2023-13410", isFaculty: false, role: "Student" },
      { name: "Miguel Antonio Roxas", email: "miguel.roxas@dlsau.edu.ph", id: "2024-13525", isFaculty: false, role: "Student" },
      { name: "Celine Bernadette Yu", email: "celine.yu@dlsau.edu.ph", id: "2022-13640", isFaculty: false, role: "Student" },
      { name: "Kevin Carl Dizon", email: "kevin.dizon@dlsau.edu.ph", id: "2023-13760", isFaculty: false, role: "Student" },
      { name: "Danielle Marie Sy", email: "danielle.sy@dlsau.edu.ph", id: "2024-13880", isFaculty: false, role: "Student" },
      { name: "Dr. Eduardo Macaraeg, DVM", email: "eduardo.macaraeg@dlsau.edu.ph", id: "2015-F150", isFaculty: true, role: "Faculty Member" },
    ],
  },
  // 5. CVMAS - BS Agriculture (BSA)
  {
    programCode: "BSA",
    programName: "Bachelor of Science in Agriculture",
    collegeCode: "CVMAS",
    collegeName: "College of Veterinary Medicine and Agricultural Sciences (CVMAS)",
    campus: "Salikneta Farm (San Jose Del Monte, Bulacan) — 63-Hectare Practical Agrivet Institute",
    users: [
      { name: "Marcelino Zapanta", email: "marcelino.zapanta@dlsau.edu.ph", id: "2024-03221", isFaculty: false, role: "Student" },
      { name: "Roderick Allan Gomez", email: "roderick.gomez@dlsau.edu.ph", id: "2023-14022", isFaculty: false, role: "Student" },
      { name: "Maria Clarisse Santos", email: "clarisse.santos@dlsau.edu.ph", id: "2024-14140", isFaculty: false, role: "Student" },
      { name: "Benigno Jose Tolentino", email: "benigno.tolentino@dlsau.edu.ph", id: "2022-14265", isFaculty: false, role: "Student" },
      { name: "Aileen Joy Dela Cruz", email: "aileen.delacruz@dlsau.edu.ph", id: "2023-14380", isFaculty: false, role: "Student" },
      { name: "Crisanto David Morales", email: "crisanto.morales@dlsau.edu.ph", id: "2024-14495", isFaculty: false, role: "Student" },
      { name: "Luzviminda Ramos", email: "luzviminda.ramos@dlsau.edu.ph", id: "2022-14510", isFaculty: false, role: "Student" },
      { name: "Rommel Jay Balagtas", email: "rommel.balagtas@dlsau.edu.ph", id: "2023-14630", isFaculty: false, role: "Student" },
      { name: "Maricris Angela Aquino", email: "maricris.aquino@dlsau.edu.ph", id: "2024-14750", isFaculty: false, role: "Student" },
      { name: "Dr. Artemio Magat", email: "artemio.magat@dlsau.edu.ph", id: "2016-F162", isFaculty: true, role: "Faculty Member" },
    ],
  },
  // 6. CVMAS - BS Food Technology (BSFT)
  {
    programCode: "BSFT",
    programName: "Bachelor of Science in Food Technology",
    collegeCode: "CVMAS",
    collegeName: "College of Veterinary Medicine and Agricultural Sciences (CVMAS)",
    campus: "Victoneta Park (Main Campus) — Food Processing & Microbiology Lab",
    users: [
      { name: "Jacob Robles", email: "jacob.robles@dlsau.edu.ph", id: "2023-04118", isFaculty: false, role: "Student" },
      { name: "Katrina Isabel Bernardo", email: "katrina.bernardo@dlsau.edu.ph", id: "2024-15012", isFaculty: false, role: "Student" },
      { name: "Leandro Jose Carreon", email: "leandro.carreon@dlsau.edu.ph", id: "2022-15135", isFaculty: false, role: "Student" },
      { name: "Charmaine Rose Del Rosario", email: "charmaine.delrosario@dlsau.edu.ph", id: "2024-15250", isFaculty: false, role: "Student" },
      { name: "Renato Carlo Mendoza", email: "renato.mendoza@dlsau.edu.ph", id: "2023-15368", isFaculty: false, role: "Student" },
      { name: "Gillian Marie Go", email: "gillian.go@dlsau.edu.ph", id: "2022-15480", isFaculty: false, role: "Student" },
      { name: "Dexter Allan Beltran", email: "dexter.beltran@dlsau.edu.ph", id: "2024-15595", isFaculty: false, role: "Student" },
      { name: "Joanna Paula Lim", email: "joanna.lim@dlsau.edu.ph", id: "2023-15615", isFaculty: false, role: "Student" },
      { name: "Adrian Paul Sunga", email: "adrian.sunga@dlsau.edu.ph", id: "2024-15730", isFaculty: false, role: "Student" },
      { name: "Prof. Evangeline Sison", email: "evangeline.sison@dlsau.edu.ph", id: "2018-F175", isFaculty: true, role: "Faculty Member" },
    ],
  },
  // 7. CBMA - BS Accountancy (BSA-Act)
  {
    programCode: "BSA-Act",
    programName: "Bachelor of Science in Accountancy",
    collegeCode: "CBMA",
    collegeName: "College of Business, Management, and Accountancy (CBMA)",
    campus: "Victoneta Park (Main Campus) — Accounting Information Systems Center",
    users: [
      { name: "Paulo Mendoza", email: "paulo.mendoza@dlsau.edu.ph", id: "2024-00214", isFaculty: false, role: "Student" },
      { name: "Mary Grace Arriola", email: "marygrace.arriola@dlsau.edu.ph", id: "2023-16015", isFaculty: false, role: "Student" },
      { name: "Carl Vincent Ong", email: "carl.ong@dlsau.edu.ph", id: "2024-16130", isFaculty: false, role: "Student" },
      { name: "Rowena Joy Estacio", email: "rowena.estacio@dlsau.edu.ph", id: "2022-16245", isFaculty: false, role: "Student" },
      { name: "Jerome Matthew Chua", email: "jerome.chua@dlsau.edu.ph", id: "2024-16360", isFaculty: false, role: "Student" },
      { name: "Kristine Mae Legaspi", email: "kristine.legaspi@dlsau.edu.ph", id: "2023-16475", isFaculty: false, role: "Student" },
      { name: "Alvin Joseph Co", email: "alvin.co@dlsau.edu.ph", id: "2022-16590", isFaculty: false, role: "Student" },
      { name: "Daphne Camille Yap", email: "daphne.yap@dlsau.edu.ph", id: "2024-16610", isFaculty: false, role: "Student" },
      { name: "Neil Patrick Serrano", email: "neil.serrano@dlsau.edu.ph", id: "2023-16725", isFaculty: false, role: "Student" },
      { name: "Prof. Ricardo Buenaventura, CPA", email: "ricardo.buenaventura@dlsau.edu.ph", id: "2016-F188", isFaculty: true, role: "Faculty Member" },
    ],
  },
  // 8. CBMA - BSBA Financial Management (BSBA-FM)
  {
    programCode: "BSBA-FM",
    programName: "BSBA Major in Financial Management",
    collegeCode: "CBMA",
    collegeName: "College of Business, Management, and Accountancy (CBMA)",
    campus: "Victoneta Park (Main Campus) — Business Analytics & Trading Simulation Suite",
    users: [
      { name: "Juan Carlo Fernandez", email: "juancarlo.fernandez@dlsau.edu.ph", id: "2023-17010", isFaculty: false, role: "Student" },
      { name: "Christine Angela Villar", email: "christine.villar@dlsau.edu.ph", id: "2024-17125", isFaculty: false, role: "Student" },
      { name: "Daryl Scott Henson", email: "daryl.henson@dlsau.edu.ph", id: "2022-17240", isFaculty: false, role: "Student" },
      { name: "Monica Denise Cabrera", email: "monica.cabrera@dlsau.edu.ph", id: "2024-17355", isFaculty: false, role: "Student" },
      { name: "Raymund Paul David", email: "raymund.david@dlsau.edu.ph", id: "2023-17470", isFaculty: false, role: "Student" },
      { name: "Shiela Marie Gonzales", email: "shiela.gonzales@dlsau.edu.ph", id: "2022-17585", isFaculty: false, role: "Student" },
      { name: "Jonathan Carl Uy", email: "jonathan.uy@dlsau.edu.ph", id: "2024-17600", isFaculty: false, role: "Student" },
      { name: "Kirsten Louise Tan", email: "kirsten.tan@dlsau.edu.ph", id: "2023-17715", isFaculty: false, role: "Student" },
      { name: "Mark Anthony Banal", email: "mark.banal@dlsau.edu.ph", id: "2024-17830", isFaculty: false, role: "Student" },
      { name: "Prof. Marites Alcantara", email: "marites.alcantara@dlsau.edu.ph", id: "2017-F199", isFaculty: true, role: "Faculty Member" },
    ],
  },
  // 9. CBMA - BSBA Marketing Management (BSBA-MM)
  {
    programCode: "BSBA-MM",
    programName: "BSBA Major in Marketing Management",
    collegeCode: "CBMA",
    collegeName: "College of Business, Management, and Accountancy (CBMA)",
    campus: "Victoneta Park (Main Campus) — Brand Strategy & Digital Marketing Lab",
    users: [
      { name: "Christian Paul Zamora", email: "christian.zamora@dlsau.edu.ph", id: "2024-18012", isFaculty: false, role: "Student" },
      { name: "Stephanie Gail Ofrasio", email: "stephanie.ofrasio@dlsau.edu.ph", id: "2023-18130", isFaculty: false, role: "Student" },
      { name: "Marco Luis Evangelista", email: "marco.evangelista@dlsau.edu.ph", id: "2022-18245", isFaculty: false, role: "Student" },
      { name: "Janelle Therese Puno", email: "janelle.puno@dlsau.edu.ph", id: "2024-18360", isFaculty: false, role: "Student" },
      { name: "Timothy James Salazar", email: "timothy.salazar@dlsau.edu.ph", id: "2023-18475", isFaculty: false, role: "Student" },
      { name: "Roxanne Faye Miranda", email: "roxanne.miranda@dlsau.edu.ph", id: "2022-18590", isFaculty: false, role: "Student" },
      { name: "Elvin John Quinto", email: "elvin.quinto@dlsau.edu.ph", id: "2024-18605", isFaculty: false, role: "Student" },
      { name: "Celine Joyce Tiongson", email: "celine.tiongson@dlsau.edu.ph", id: "2023-18720", isFaculty: false, role: "Student" },
      { name: "Patrick Sean Vergara", email: "patrick.vergara@dlsau.edu.ph", id: "2024-18835", isFaculty: false, role: "Student" },
      { name: "Prof. Noel Manalastas", email: "noel.manalastas@dlsau.edu.ph", id: "2018-F205", isFaculty: true, role: "Faculty Member" },
    ],
  },
  // 10. CBMA - BS Hospitality Management (BSHM)
  {
    programCode: "BSHM",
    programName: "Bachelor of Science in Hospitality Management",
    collegeCode: "CBMA",
    collegeName: "College of Business, Management, and Accountancy (CBMA)",
    campus: "Victoneta Park (Main Campus) — Hot & Cold Kitchen Suites & Mock Hotel",
    users: [
      { name: "Alyssa Marie Valdez", email: "alyssa.valdez@dlsau.edu.ph", id: "2023-19015", isFaculty: false, role: "Student" },
      { name: "Gerard Lorenzo Santos", email: "gerard.santos@dlsau.edu.ph", id: "2024-19130", isFaculty: false, role: "Student" },
      { name: "Francine Nicole Lim", email: "francine.lim@dlsau.edu.ph", id: "2022-19245", isFaculty: false, role: "Student" },
      { name: "Jayson Mark Bernardo", email: "jayson.bernardo@dlsau.edu.ph", id: "2024-19360", isFaculty: false, role: "Student" },
      { name: "Ella Mae Concepcion", email: "ella.concepcion@dlsau.edu.ph", id: "2023-19475", isFaculty: false, role: "Student" },
      { name: "Russell Dave Ignacio", email: "russell.ignacio@dlsau.edu.ph", id: "2022-19590", isFaculty: false, role: "Student" },
      { name: "Kayla Denise Roxas", email: "kayla.roxas@dlsau.edu.ph", id: "2024-19605", isFaculty: false, role: "Student" },
      { name: "Bryan Christopher Sy", email: "bryan.sy@dlsau.edu.ph", id: "2023-19720", isFaculty: false, role: "Student" },
      { name: "Angelica Faith Dizon", email: "angelica.dizon@dlsau.edu.ph", id: "2024-19835", isFaculty: false, role: "Student" },
      { name: "Chef Ronald Villanueva", email: "ronald.villanueva@dlsau.edu.ph", id: "2017-F218", isFaculty: true, role: "Faculty Member" },
    ],
  },
  // 11. CBMA - BS Tourism Management (BSTM)
  {
    programCode: "BSTM",
    programName: "Bachelor of Science in Tourism Management",
    collegeCode: "CBMA",
    collegeName: "College of Business, Management, and Accountancy (CBMA)",
    campus: "Victoneta Park (Main Campus) — Global Distribution Systems Lab (Amadeus/Sabre)",
    users: [
      { name: "Kristine Joy Bernardo", email: "kristine.bernardo@dlsau.edu.ph", id: "2024-20010", isFaculty: false, role: "Student" },
      { name: "Julian Gabriel Torres", email: "julian.torres@dlsau.edu.ph", id: "2023-20125", isFaculty: false, role: "Student" },
      { name: "Marielle Anne Pascual", email: "marielle.pascual@dlsau.edu.ph", id: "2022-20240", isFaculty: false, role: "Student" },
      { name: "Cedric Paul David", email: "cedric.david@dlsau.edu.ph", id: "2024-20355", isFaculty: false, role: "Student" },
      { name: "Therese Nicole Castro", email: "therese.castro@dlsau.edu.ph", id: "2023-20470", isFaculty: false, role: "Student" },
      { name: "Adrian Miguel Cortez", email: "adrian.cortez@dlsau.edu.ph", id: "2022-20585", isFaculty: false, role: "Student" },
      { name: "Camille Diane Flores", email: "camille.flores@dlsau.edu.ph", id: "2024-20600", isFaculty: false, role: "Student" },
      { name: "Joshua Dave Macaraeg", email: "joshua.macaraeg@dlsau.edu.ph", id: "2023-20715", isFaculty: false, role: "Student" },
      { name: "Rachel Marie Alcantara", email: "rachel.alcantara@dlsau.edu.ph", id: "2024-20830", isFaculty: false, role: "Student" },
      { name: "Prof. Melinda Soriano", email: "melinda.soriano@dlsau.edu.ph", id: "2019-F225", isFaculty: true, role: "Faculty Member" },
    ],
  },
  // 12. COED - Bachelor in Elementary Education (BEEd)
  {
    programCode: "BEEd",
    programName: "Bachelor in Elementary Education",
    collegeCode: "COED",
    collegeName: "College of Education (COED)",
    campus: "Victoneta Park (Main Campus) — Childhood Demonstration Classroom",
    users: [
      { name: "Princess Joy Salonga", email: "princess.salonga@dlsau.edu.ph", id: "2023-21015", isFaculty: false, role: "Student" },
      { name: "Joshua Miguel Aranas", email: "joshua.aranas@dlsau.edu.ph", id: "2024-21130", isFaculty: false, role: "Student" },
      { name: "Katrina Elaine Morales", email: "katrina.morales@dlsau.edu.ph", id: "2022-21245", isFaculty: false, role: "Student" },
      { name: "John David Esguerra", email: "john.esguerra@dlsau.edu.ph", id: "2024-21360", isFaculty: false, role: "Student" },
      { name: "Maria Lourdes Santos", email: "marialourdes.santos@dlsau.edu.ph", id: "2023-21475", isFaculty: false, role: "Student" },
      { name: "Alfonso Rafael Cruz", email: "alfonso.cruz@dlsau.edu.ph", id: "2022-21590", isFaculty: false, role: "Student" },
      { name: "Clarissa Anne Reyes", email: "clarissa.reyes@dlsau.edu.ph", id: "2024-21605", isFaculty: false, role: "Student" },
      { name: "Manuel Paulo Diaz", email: "manuel.diaz@dlsau.edu.ph", id: "2023-21720", isFaculty: false, role: "Student" },
      { name: "Dianne Rose Guinto", email: "dianne.guinto@dlsau.edu.ph", id: "2024-21835", isFaculty: false, role: "Student" },
      { name: "Dr. Alicia Panganiban", email: "alicia.panganiban@dlsau.edu.ph", id: "2015-F238", isFaculty: true, role: "Faculty Member" },
    ],
  },
  // 13. COED - Bachelor in Secondary Education (BSEd)
  {
    programCode: "BSEd",
    programName: "Bachelor in Secondary Education",
    collegeCode: "COED",
    collegeName: "College of Education (COED)",
    campus: "Victoneta Park (Main Campus) — Secondary Teaching & Pedagogy Center",
    users: [
      { name: "Geronimo David", email: "geronimo.david@dlsau.edu.ph", id: "2023-22014", isFaculty: false, role: "Student" },
      { name: "Eunice Clarisse Yap", email: "eunice.yap@dlsau.edu.ph", id: "2024-22130", isFaculty: false, role: "Student" },
      { name: "Jeremiah Luke Ramos", email: "jeremiah.ramos@dlsau.edu.ph", id: "2022-22245", isFaculty: false, role: "Student" },
      { name: "Abigail Joy Villanueva", email: "abigail.villanueva@dlsau.edu.ph", id: "2024-22360", isFaculty: false, role: "Student" },
      { name: "Vincent Edward Navarro", email: "vincent.navarro@dlsau.edu.ph", id: "2023-22475", isFaculty: false, role: "Student" },
      { name: "Stephanie Marie Castro", email: "stephanie.castro@dlsau.edu.ph", id: "2022-22590", isFaculty: false, role: "Student" },
      { name: "Renz Carlo Mendoza", email: "renz.mendoza@dlsau.edu.ph", id: "2024-22605", isFaculty: false, role: "Student" },
      { name: "Kyla Jean Tolentino", email: "kyla.tolentino@dlsau.edu.ph", id: "2023-22720", isFaculty: false, role: "Student" },
      { name: "Marc Daniel Hernandez", email: "marc.hernandez@dlsau.edu.ph", id: "2024-22835", isFaculty: false, role: "Student" },
      { name: "Prof. Lourdes Carandang", email: "lourdes.carandang@dlsau.edu.ph", id: "2016-F245", isFaculty: true, role: "Faculty Member" },
    ],
  },
];

const ORIGINAL_EXCEL_USERS = [
  { name: "Dlsau Lostlink", email: "dlsau.lostlink@dlsau.edu.ph", pwd: "admin123", role: "admin", orig: "admin123" },
  { name: "Test Lostlink", email: "test.lostlink@dlsau.edu.ph", pwd: "test123456", role: "admin", orig: "test" },
  { name: "Andrew Cruz", email: "andrew.cruz@dlsau.edu.ph", pwd: "Andoy123", role: "admin", orig: "Andoy123" },
  { name: "Zian Piangco", email: "zian.piangco@dlsau.edu.ph", pwd: "zian123456", role: "admin", orig: "zian" },
  { name: "Xeidale Almonina", email: "xeidale.almonina@dlsau.edu.ph", pwd: "almonina", role: "user", orig: "almonina" },
  { name: "Johanne Capili", email: "johanne.capili@dlsau.edu.ph", pwd: "capili", role: "user", orig: "capili" },
  { name: "Charmaine Casi", email: "charmaine.casi@dlsau.edu.ph", pwd: "casi123456", role: "user", orig: "casi" },
  { name: "Iris Chua", email: "iris.chua@dlsau.edu.ph", pwd: "chua123456", role: "user", orig: "chua" },
  { name: "Justin Encarnado", email: "justin.encarnado@dlsau.edu.ph", pwd: "encarnado", role: "user", orig: "encarnado" },
  { name: "Brian Fonte", email: "brian.fonte@dlsau.edu.ph", pwd: "fonte123456", role: "user", orig: "fonte" },
  { name: "Justine Garma", email: "justine.garma@dlsau.edu.ph", pwd: "garma123456", role: "user", orig: "garma" },
  { name: "Louievince Laguidao", email: "louievince.laguidao@dlsau.edu.ph", pwd: "laguidao", role: "user", orig: "laguidao" },
  { name: "Idan Lanuza", email: "idan.lanuza@dlsau.edu.ph", pwd: "lanuza", role: "user", orig: "lanuza" },
  { name: "Sean Marquez", email: "sean.marquez@dlsau.edu.ph", pwd: "marquez", role: "user", orig: "marquez" },
  { name: "Antonette Melon", email: "antonette.melon@dlsau.edu.ph", pwd: "antonette", role: "user", orig: "antonette" },
  { name: "Reynalyn Morbo", email: "reynalyn.morbo@dlsau.edu.ph", pwd: "morbo123456", role: "user", orig: "morbo" },
  { name: "Erick Oliveros", email: "erick.oliveros@dlsau.edu.ph", pwd: "oliveros", role: "user", orig: "oliveros" },
  { name: "Ice Ramirez", email: "ice.ramirez@dlsau.edu.ph", pwd: "ramirez", role: "user", orig: "ramirez" },
  { name: "Jhenelle Refuerzo", email: "jhenelle.refuerzo@dlsau.edu.ph", pwd: "refuerzo", role: "user", orig: "refuerzo" },
  { name: "Jacob Robles", email: "jacob.robles@dlsau.edu.ph", pwd: "robles", role: "user", orig: "robles" },
  { name: "Cyril Rodriguez", email: "cyril.rodriguez@dlsau.edu.ph", pwd: "manginasal", role: "user", orig: "manginasal" },
  { name: "Allan Rosco", email: "allan.rosco@dlsau.edu.ph", pwd: "rosco123456", role: "user", orig: "rosco" },
  { name: "Carlos Santos", email: "carlos.santos@dlsau.edu.ph", pwd: "santos", role: "user", orig: "santos" },
  { name: "Jan Santos", email: "jan.santos@dlsau.edu.ph", pwd: "santos", role: "user", orig: "santos" },
  { name: "Ysabelle Sison", email: "ysabelle.sison@dlsau.edu.ph", pwd: "sison123456", role: "user", orig: "sison" },
  { name: "Lou Siwa", email: "lou.siwa@dlsau.edu.ph", pwd: "siwa123456", role: "user", orig: "siwa" },
  { name: "Chelsy Tuazon", email: "chelsy.tuazon@dlsau.edu.ph", pwd: "tuazon", role: "user", orig: "tuazon" },
  { name: "Marcelino Zapanta", email: "marcelino.zapanta@dlsau.edu.ph", pwd: "zapanta", role: "user", orig: "zapanta" },
  { name: "Marilyn Rubrica", email: "marilyn.rubrica@dlsau.edu.ph", pwd: "rubrica", role: "user", orig: "rubrica" },
  { name: "Alex Pasion", email: "alex.pasion@dlsau.edu.ph", pwd: "pasion", role: "user", orig: "pasion" },
  { name: "Julius Bancud", email: "julius.bancud@dlsau.edu.ph", pwd: "bancud", role: "user", orig: "bancud" },
  { name: "Norman Andres", email: "norman.andres@dlsau.edu.ph", pwd: "andres", role: "user", orig: "andres" },
  { name: "Jeoffrey Causapin", email: "jeoffrey.causapin@dlsau.edu.ph", pwd: "joeffrey", role: "user", orig: "joeffrey" },
  { name: "Manuel Piangco", email: "manuel.piangco@dlsau.edu.ph", pwd: "zian123456", role: "user", orig: "zian" },
  { name: "Huan Marzan", email: "huan.marzan@gmail.com", pwd: "huan123456", role: "user", orig: "huan" },
  { name: "Jose Gabo", email: "jose.gabo@dlsau.edu.ph", pwd: "jose123456", role: "user", orig: "jose" },
  { name: "Aaron Lavela", email: "aaron.lavela@dlsau.edu.ph", pwd: "aaron123456", role: "user", orig: "aaron" },
  { name: "Joshua Enriquez", email: "joshua.enriquez@dlsau.edu.ph", pwd: "huan123456", role: "user", orig: "huan" },
  { name: "Paulo Mendoza", email: "paulo.mendoza@dlsau.edu.ph", pwd: "paulo123456", role: "user", orig: "paulo" },
];

let md = "# LostLink Complete Accounts & Credentials Directory\n\n";

md += "> [!IMPORTANT]\n";
md += "> All **130 newly seeded student and faculty accounts** across the 4 DLSAU colleges are registered in **live Supabase Auth & profiles** with the universal temporary password:\n";
md += "> \n";
md += "> ### **`DlsauPassword2026!`**\n";
md += "> \n";
md += "> Institutional emails use `@dlsau.edu.ph` and are auto-confirmed. Faculty accounts are provisioned under their colleges with **standard student privileges** (no elevated admin rights).\n\n";

md += "## Quick Executive & Administrator Access\n\n";
md += "| Full Name | University Email | Password | Role / Access Level |\n";
md += "| :--- | :--- | :--- | :--- |\n";
md += "| Disciplinary Office Admin | `dlsau.lostlink@dlsau.edu.ph` | `admin123` | **DO Administrator** |\n";
md += "| Andrew Cruz | `andrew.cruz@dlsau.edu.ph` | `Andoy123` | **DO Head / Admin** |\n";
md += "| Zian Piangco | `zian.piangco@dlsau.edu.ph` | `zian123456` | **System Administrator** |\n";
md += "| Test Lostlink | `test.lostlink@dlsau.edu.ph` | `test123456` | **Admin QA Account** |\n\n";

md += "---\n\n";
md += "## College Programs Directory (13 Degree Programs • 130 Accounts)\n\n";

const colleges = [
  { code: "CAST", name: "College of Arts, Sciences and Technology (CAST)" },
  { code: "CVMAS", name: "College of Veterinary Medicine and Agricultural Sciences (CVMAS)" },
  { code: "CBMA", name: "College of Business, Management, and Accountancy (CBMA)" },
  { code: "COED", name: "College of Education (COED)" },
];

for (const col of colleges) {
  md += `### ${col.name}\n\n`;
  const progs = PROGRAM_ACCOUNTS.filter((p) => p.collegeCode === col.code);

  for (const p of progs) {
    md += `#### ${p.programCode} — ${p.programName}\n`;
    md += `* **Designated Campus / Facility:** ${p.campus}\n`;
    md += `* **Universal Password:** \`DlsauPassword2026!\`\n\n`;
    md += "| Full Name | University Email | Password | Student / Faculty ID | Role / Designation |\n";
    md += "| :--- | :--- | :--- | :--- | :--- |\n";

    for (const u of p.users) {
      const roleText = u.isFaculty ? "**Faculty (Student Perms)**" : "Student";
      md += `| ${u.name} | \`${u.email}\` | \`DlsauPassword2026!\` | \`${u.id}\` | ${roleText} |\n`;
    }
    md += "\n";
  }
}

md += "---\n\n";
md += "## Original Spreadsheet & Tester Seed Accounts\n\n";
md += "> [!NOTE]\n";
md += "> Passwords under 6 characters from the original spreadsheet (e.g. `cruz`, `fonte`, `zian`) were appended with `123456` to comply with Supabase Auth security constraints.\n\n";
md += "| Full Name | University Email | Password | Role | Original Spreadsheet Pwd |\n";
md += "| :--- | :--- | :--- | :--- | :--- |\n";

for (const u of ORIGINAL_EXCEL_USERS) {
  md += `| ${u.name} | \`${u.email}\` | \`${u.pwd}\` | **${u.role}** | \`${u.orig}\` |\n`;
}
md += "\n";

fs.writeFileSync("database/ACCOUNTS_CREDENTIALS.md", md, "utf8");
fs.writeFileSync("account_credentials.md", md, "utf8");
console.log("Successfully written credentials to database/ACCOUNTS_CREDENTIALS.md and account_credentials.md");
