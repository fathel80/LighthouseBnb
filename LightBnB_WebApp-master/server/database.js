const properties = require('./json/properties.json');
const users = require('./json/users.json');
const { Pool } = require('pg');
const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool
    .query(`SELECT * FROM users WHERE email = $1`, [email])
    .then((output) => {
      const user = output.rows[0]
      return user;
    })

}
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool
    .query(`SELECT * FROM users WHERE id = $1`, [id])
    .then(output => {
      const id = output.rows[0]
      return id;
    })
}
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser =  function(user) {
  let name = user.name;
  let email = user.email;
  let password = "password";

  const sqlQuery = `
  INSERT INTO users (name, email, password)
  VALUES ($1, $2, $3)
  RETURNING *
  `;

  return pool 
    .query(sqlQuery, [name, email, password])
    .then(res => {
      return res.rows[0]
    })


  // const userId = Object.keys(users).length + 1;
  // user.id = userId;
  // users[userId] = user;
  // return Promise.resolve(user);
}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  const sqlQuery =`
  SELECT reservations.*, properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN reservations ON reservations.property_id = properties.id
  JOIN property_reviews ON property_reviews.property_id = properties.id
  WHERE reservations.guest_id = $1
  AND reservations.end_date  < now()::date
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT $2
  `;
  return pool 
    .query(sqlQuery, [guest_id, limit])
    .then(res => {
      return res.rows
    })
}
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = (options, limit = 10) => {

  const {

    city,
    owner_id,
    minimum_price_per_night,
    maximum_price_per_night,
    minimum_rating

  } = options;

  const queryParam = [];
  const queryArray = [];
  const ownerProperty = [];

  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `
  if (city) {
    queryParam.push(`%${city}%`);
    queryArray.push(`city LIKE $${queryParam.length}`);
  }

  if(owner_id) {
    queryParam.push(owner_id);
    ownerProperty.push(`owner_id = $${queryParam.length}`);
  }

  if(minimum_price_per_night) {
    queryParam.push(minimum_price_per_night * 100);
    queryArray.push(`cost_per_night > $${queryParam.length}`);
  }

  if(maximum_price_per_night) {
    queryParam.push(maximum_price_per_night * 100);
    queryArray.push(`cost_per_night <= $${queryParam.length}`);
  }

  if(minimum_rating) {
    queryParam.push(minimum_rating);
    queryArray.push(`rating >= $${queryParam.length}`);
    
  }

  queryParam.push(limit);

  if (queryArray.length > 0) {
    queryString += `WHERE ${queryArray.join (' AND ')}`
  }

  if (ownerProperty.length > 0) {
    queryString += `JOIN users ON owner_id = users.id
  WHERE ${ownerProperty}`
  }

  queryString += `
  GROUP BY properties.id
  ORDER BY cost_per_night
  LIMIT $${queryParam.length};

  `

    console.log(queryString, queryParam);

    return pool.query(queryString, queryParam).then((res)=> res.rows );







  // return pool
  //   .query(`
  //   SELECT *
  //   FROM properties
  //   LIMIT $1`, [limit])
  //   .then((result) => {
  //     return result.rows
  //   })
  //   .catch((err) => {
  //     console.error(err.message)
  //   });

};
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  return pool.query(`
    INSERT INTO properties (owner_id, title, description,thumbnail_photo_url, cover_photo_url,cost_per_night,street,city,province,post_code,country,parking_spaces,number_of_bathrooms,number_of_bedrooms) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *;
  `, [
            property.owner_id,
            property.title,
            property.description,
            property.thumbnail_photo_url,
            property.cover_photo_url,
            property.cost_per_night || 0,
            property.street,
            property.city,
            property.province,
            property.post_code,
            property.country,
            property.parking_spaces || 0,
            property.number_of_bathrooms || 0,
            property.number_of_bedrooms || 0
        ])
        .then(res => {
            console.log(res.rows)
            return res.rows
})
}

exports.addProperty = addProperty;