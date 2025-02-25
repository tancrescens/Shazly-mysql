const express = require('express');
const hbs = require('hbs');
const wax = require('wax-on');
require('dotenv').config();
const { createConnection } = require('mysql2/promise');

let app = express();
app.set('view engine', 'hbs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

wax.on(hbs.handlebars);
wax.setLayoutPath('./views/layouts');

// require in handlebars and their helpers
const helpers = require('handlebars-helpers');
// tell handlebars-helpers where to find handlebars
helpers({
    'handlebars': hbs.handlebars
})

let connection;

async function main() {
    connection = await createConnection({
        'host': process.env.DB_HOST,
        'user': process.env.DB_USER,
        'database': process.env.DB_NAME,
        'password': process.env.DB_PASSWORD
    })

    app.get('/', (req, res) => {
        res.send('Hello, World!');
    });

    // app.get('/customers', async (req, res) => {
    //     let [customers] = await connection.execute('SELECT * FROM Customers INNER JOIN Companies ON Customers.company_id = Companies.company_id');
    //     res.render('customers/index', {
    //         'customers': customers
    //     })
    // })

    app.get('/customers', async function (req, res) {

        const firstName = req.query.first_name;
        const lastName = req.query.last_name;
        const ratings = req.query.ratings;

        let sql = `
            SELECT * FROM Customers
                JOIN Companies
            ON Customers.company_id = Companies.company_id WHERE 1
        `
        const bindings = [];

        // if the firstName variable is given a truthify value
        // (in other words, not null, not undefined, not '', not 0, not false)
        if (firstName) {
            sql += " AND first_name LIKE ?";
            bindings.push('%' + firstName + '%')
        }
        if (lastName) {
            sql += " AND last_name LIKE ?";
            bindings.push('%' + lastName + '%')
        }
        if (ratings) {
            sql += " AND rating >= ?";
            bindings.push(ratings)
        }

        const [customers] = await connection.execute(sql, bindings);

        res.render('customers/index', {
            'customers': customers,
            'searchParams': req.query
        })

    });

    app.get('/customers/create', async (req, res) => {
        let [companies] = await connection.execute('SELECT * from Companies');
        let [employees] = await connection.execute('SELECT * from Employees');
        res.render('customers/create', {
            'companies': companies,
            'employees': employees
        })
    })

    app.post('/customers/create', async (req, res) => {
        let { first_name, last_name, rating, company_id, employee_id } = req.body;
        let query = 'INSERT INTO Customers (first_name, last_name, rating, company_id) VALUES (?, ?, ?, ?)';
        let bindings = [first_name, last_name, rating, company_id];
        let [result] = await connection.execute(query, bindings);

        let newCustomerId = result.insertId;

        if (employee_id) {
            for (let id of employee_id) {
                let query = 'INSERT INTO EmployeeCustomer (employee_id, customer_id) VALUES (?, ?)';
                let bindings = [id, newCustomerId];
                await connection.execute(query, bindings);
            }
        }

        res.redirect('/customers');
    })

    app.get('/customers/:customer_id/edit', async (req, res) => {
        let [employees] = await connection.execute('SELECT * from Employees');
        let [customers] = await connection.execute('SELECT * from Customers WHERE customer_id = ?', [req.params.customer_id]);
        let [companies] = await connection.execute('SELECT * from Companies');

        let rawDataCompanies = await connection.execute('SELECT * from Companies');
        console.log(rawDataCompanies)

        let [employeeCustomers] = await connection.execute('SELECT * from EmployeeCustomer WHERE customer_id = ?', [req.params.customer_id]);

        let customer = customers[0];
        let relatedEmployees = employeeCustomers.map(ec => ec.employee_id);

        res.render('customers/edit', {
            'customer': customer,
            'employees': employees,
            'companies': companies,
            'relatedEmployees': relatedEmployees
        })
    });

    app.post('/customers/:customer_id/edit', async (req, res) => {
        let { first_name, last_name, rating, company_id, employee_id } = req.body;

        let query = 'UPDATE Customers SET first_name=?, last_name=?, rating=?, company_id=? WHERE customer_id=?';
        let bindings = [first_name, last_name, rating, company_id, req.params.customer_id];
        await connection.execute(query, bindings);

        await connection.execute('DELETE FROM EmployeeCustomer WHERE customer_id = ?', [req.params.customer_id]);

        if (employee_id) {
            for (let id of employee_id) {
                let query = 'INSERT INTO EmployeeCustomer (employee_id, customer_id) VALUES (?, ?)';
                let bindings = [id, req.params.customer_id];
                await connection.execute(query, bindings);
            }
        }

        res.redirect('/customers');
    });

    app.get('/customers/:customer_id/delete', async function (req, res) {
        // display a confirmation form 
        const [customers] = await connection.execute(
            "SELECT * FROM Customers WHERE customer_id =?", [req.params.customer_id]
        );
        const customer = customers[0];

        res.render('customers/delete', {
            customer
        })

    })

    app.post('/customers/:customer_id/delete', async function (req, res) {

        await connection.execute(`DELETE FROM Customers WHERE customer_id = ?`, [req.params.customer_id]);
        res.redirect('/customers');
    })

    app.listen(3000, () => {
        console.log('Server is running')
    });
}

main();
