/** Customer for Lunchly */

const db = require("../db");
const Reservation = require("./reservation");

/** Customer of the restaurant. */

class Customer {
  constructor({ id, firstName, lastName, phone, notes }) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.phone = phone;
    this.notes = notes;
  }

  /** find all customers. */

  static async all() {
    const results = await db.query(
      `SELECT id,
         first_name AS "firstName",
         last_name AS "lastName",
         phone,
         notes
       FROM customers
       ORDER BY last_name, first_name`
    );
    return results.rows.map(c => new Customer(c));
  }

  /** get a customer by ID. */

  static async get(id) {
    const results = await db.query(
      `SELECT id,
         first_name AS "firstName",
         last_name AS "lastName",
         phone,
         notes
        FROM customers WHERE id = $1`,
      [id]
    );

    const customer = results.rows[0];

    if (customer === undefined) {
      const err = new Error(`No such customer: ${id}`);
      err.status = 404;
      throw err;
    }

    return new Customer(customer);
  }

  /** get all reservations for this customer. */

  async getReservations() {
    return await Reservation.getReservationsForCustomer(this.id);
  }

  /** save this customer. */

  async save() {
    if (this.id === undefined) {
      const result = await db.query(
        `INSERT INTO customers (first_name, last_name, phone, notes)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
        [this.firstName, this.lastName, this.phone, this.notes]
      );
      this.id = result.rows[0].id;
    } else {
      await db.query(
        `UPDATE customers SET first_name=$1, last_name=$2, phone=$3, notes=$4
             WHERE id=$5`,
        [this.firstName, this.lastName, this.phone, this.notes, this.id]
      );
    }
  }

  /** Returns the customer's first and last name */
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  // /** seaches customers for a matching customer */
  static async search(searchStr) {

    let searchSplit = searchStr.split(' ');
    let search1, search2;

    if (searchSplit.length > 1) {
      [search1, search2] = [searchSplit[0], searchSplit[1]];
    } else {
      search1 = searchSplit[0];
      search2 = searchSplit[0];
    }

    const results = await db.query(`
      SELECT id,
             first_name AS "firstName",
             last_name AS "lastName",
             phone,
             notes
        FROM customers
        WHERE first_name LIKE $1 OR
              last_name LIKE $2`,
              [`%${search1}%`, `%${search2}%`]);

    return results.rows.map(c => new Customer(c));
  }



  /** Find top 10 customers by number of reservations */

  static async topCustomers() {
    const results = await db.query(
      `SELECT c.id,
              c.first_name AS "firstName",
              c.last_name AS "lastName",
              c.phone,
              c.notes,
              COUNT(*) AS number_reservations
       FROM customers AS c
       JOIN reservations
       ON customer_id = c.id
       GROUP BY c.id, c.first_name, c.last_name, c.phone, c.notes
       ORDER BY COUNT(*) DESC
       LIMIT 10`
    )

    return results.rows.map(c => new Customer(c));
  }

  /**
   * If someone tries to assign a falsey value to a customer’s
   * notes, the value instead gets assigned to an empty string.
   */
  set notes(note) {
    this._notes = note || "";
  }
}

module.exports = Customer;
