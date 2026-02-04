export const typeDefs = `#graphql
  type LegacyLogin {
    id: Int
    username: String
    role: String
    full_name: String
  }

  type DetailItem {
    id: String
    username: String
    montant: Float
    nb_jours: Float
    details: String
    date: String
    created_at: String
  }

  type Employee {
    id: Int
    name: String
    department: String
  }

  type Chiffre {
    id: Int
    date: String
    recette_de_caisse: String
    total_diponce: String
    diponce: String # Stringified JSON
    diponce_divers: String # Stringified JSON
    diponce_admin: String # Stringified JSON
    recette_net: String
    tpe: String
    tpe2: String
    cheque_bancaire: String
    espaces: String
    tickets_restaurant: String
    extra: String
    primes: String
    offres: String
    offres_data: String # Stringified JSON
    caisse_photo: String # Base64
    is_locked: Boolean
    # Bey Database Fields
    avances_details: [DetailItem]
    doublages_details: [DetailItem]
    extras_details: [DetailItem]
    primes_details: [DetailItem]
    restes_salaires_details: [DetailItem]
  }

  type Supplier {
    id: Int
    name: String
  }

  type Designation {
    id: Int
    name: String
    type: String
  }


  type SalaryHistory {
    month: String
    total: Float
  }

  type PaidUser {
    username: String
    amount: Float
  }

  type Invoice {
    id: Int
    supplier_name: String
    amount: String
    date: String
    photo_url: String
    photos: String # Stringified JSON array
    photo_cheque_url: String
    photo_verso_url: String
    status: String
    payment_method: String
    paid_date: String
    doc_type: String
    doc_number: String
    payer: String
    origin: String
    category: String
    updated_at: String
    details: String
    coutachat: Boolean
  }

  type BankDeposit {
    id: Int
    amount: String
    date: String
    type: String
  }

  type SalaryRemainder {
    id: Int
    employee_name: String
    amount: Float
    month: String
    status: String
    updated_at: String
  }

  type PaymentStats {
    totalRecetteNette: Float
    totalFacturesPayees: Float
    totalUnpaidInvoices: Float
    totalTicketsRestaurant: Float
    totalTPE: Float
    totalCheque: Float
    totalCash: Float
    totalBankDeposits: Float
    totalRecetteCaisse: Float
    totalExpenses: Float
    totalRiadhExpenses: Float
    totalRestesSalaires: Float
    totalOffres: Float
  }

  type UserAccount {
    id: Int
    username: String
    password: String
    role: String
    full_name: String
    last_active: String
    is_online: Boolean
    device_info: String
    ip_address: String
    is_blocked_user: Boolean
    face_data: String
    has_face_id: Boolean
  }

  type Device {
    id: Int
    ip: String
    name: String
    type: String
    status: String
    last_seen: String
  }

  type SystemStatus {
    is_blocked: Boolean
  }

  type JournalierPhoto {
    id: Int
    date: String
    category: String
    item_index: Int
    photos: String # JSON array
  }

  type ArticleFamily {
    id: Int
    name: String
    rows: String # JSON string
    suppliers: String # JSON string
    updated_at: String
  }

  type Query {
    getChiffreByDate(date: String!): Chiffre
    getChiffresByRange(startDate: String!, endDate: String!): [Chiffre]
    getSuppliers: [Supplier]
    getDesignations: [Designation]
    getMonthlySalaries(startDate: String!, endDate: String!): [SalaryHistory]
    getPaidUsers(month: String, startDate: String, endDate: String): [PaidUser]
    getInvoices(supplierName: String, startDate: String, endDate: String, month: String, payer: String, filterBy: String): [Invoice]
    getPaymentStats(month: String, startDate: String, endDate: String, filterBy: String): PaymentStats
    getBankDeposits(month: String, startDate: String, endDate: String): [BankDeposit]
    getLockedDates: [String]
    getDailyExpenses(month: String, startDate: String, endDate: String): [Chiffre]
    getEmployees: [Employee]
    getSalaryRemainders(month: String): [SalaryRemainder]
    getConnectedDevices: [Device]
    getSystemStatus: SystemStatus
    getUsers: [UserAccount]
    getConnectionLogs: [ConnectionLog]
    getJournalierPhotos(date: String!): [JournalierPhoto]
    getArticleFamilies: [ArticleFamily]
  }

  type ConnectionLog {
    id: Int
    username: String
    ip_address: String
    device_info: String
    browser: String
    connected_at: String
  }

  type Mutation {
    saveChiffre(
      date: String!
      recette_de_caisse: String!
      total_diponce: String!
      diponce: String!
      diponce_divers: String!
      diponce_admin: String!
      recette_net: String!
      tpe: String!
      tpe2: String
      cheque_bancaire: String!
      espaces: String!
      tickets_restaurant: String!
      extra: String!
      primes: String!
      offres: String
      offres_data: String
      caisse_photo: String
      payer: String
    ): Chiffre
    
    upsertSupplier(name: String!): Supplier
    updateSupplier(id: Int!, name: String!): Supplier
    deleteSupplier(id: Int!): Boolean

    upsertDesignation(name: String!, type: String): Designation
    updateDesignation(id: Int!, name: String!, type: String): Designation
    deleteDesignation(id: Int!): Boolean

    addInvoice(
      supplier_name: String!
      amount: String!
      date: String!
      photo_url: String
      photos: String
      doc_type: String
      doc_number: String
      category: String
      details: String
    ): Invoice

    payInvoice(
      id: Int!
      payment_method: String!
      paid_date: String!
      photo_cheque_url: String
      photo_verso_url: String
      payer: String
      coutachat: Boolean
    ): Invoice

    deleteInvoice(id: Int!): Boolean
    
    unpayInvoice(id: Int!): Invoice
    updateInvoice(
      id: Int!
      supplier_name: String
      amount: String
      date: String
      photo_url: String
      photos: String
      doc_type: String
      doc_number: String
      payment_method: String
      paid_date: String
      category: String
      details: String
      coutachat: Boolean
    ): Invoice
    
    addBankDeposit(
      amount: String!
      date: String!
      type: String
    ): BankDeposit

    updateBankDeposit(
      id: Int!
      amount: String!
      date: String!
      type: String
    ): BankDeposit

    deleteBankDeposit(id: Int!): Boolean

    addPaidInvoice(
      supplier_name: String!
      amount: String!
      date: String!
      photo_url: String
      photos: String
      photo_cheque_url: String
      photo_verso_url: String
      payment_method: String!
      paid_date: String!
      doc_type: String
      doc_number: String
      payer: String
      category: String
      details: String
      coutachat: Boolean
    ): Invoice

    unlockChiffre(date: String!): Chiffre

    upsertEmployee(name: String!, department: String): Employee
    updateEmployee(id: Int!, name: String!, department: String): Employee
    deleteEmployee(id: Int!): Boolean

    addAvance(username: String!, amount: Float!, date: String!, details: String): DetailItem
    deleteAvance(id: String!): Boolean

    addDoublage(username: String!, amount: Float!, date: String!, details: String): DetailItem
    deleteDoublage(id: String!): Boolean

    addExtra(username: String!, amount: Float!, date: String!, details: String): DetailItem
    deleteExtra(id: String!): Boolean

    addPrime(username: String!, amount: Float!, date: String!, details: String): DetailItem
    deletePrime(id: String!): Boolean

    addRestesSalaires(username: String!, amount: Float!, nb_jours: Float, date: String!, details: String): DetailItem
    deleteRestesSalaires(id: String!): Boolean
    
    upsertSalaryRemainder(employee_name: String!, amount: Float!, month: String!, status: String): SalaryRemainder
    deleteSalaryRemainder(id: Int!): Boolean

    updatePassword(username: String!, newPassword: String!): Boolean
    toggleSystemBlock(isBlocked: Boolean!): Boolean

    upsertUser(username: String!, password: String!, role: String!, full_name: String, face_data: String): UserAccount
    deleteUser(id: Int!): Boolean
    
    upsertDevice(ip: String!, name: String, type: String): Device
    deleteDevice(id: Int!): Boolean

    heartbeat(username: String!, deviceInfo: String, ipAddress: String): Boolean
    recordConnection(username: String!, ipAddress: String, deviceInfo: String, browser: String): Boolean
    clearConnectionLogs: Boolean
    disconnectUser(username: String!): Boolean
    toggleUserBlock(username: String!, isBlocked: Boolean!): Boolean
    
    uploadJournalierPhotos(date: String!, category: String!, item_index: Int!, photos: String!): JournalierPhoto
    deleteJournalierPhoto(id: Int!): Boolean
    
    clearChiffreData(date: String!): Boolean
    replaceChiffreDate(oldDate: String!, newDate: String!): Boolean

    addArticleFamily(name: String!): ArticleFamily
    updateArticleFamily(id: Int!, name: String, rows: String, suppliers: String): ArticleFamily
    deleteArticleFamily(id: Int!): Boolean
  }
`;
