const validation = require('./userValidation');
const ApiError = require('../util/ApiError');
const Country = require('../country/CountrySchema');
const User = require('./UserSchema');
const bcrypt = require('bcrypt');

/*  @POST /user/register/
 *  ACCESS public
 *  Handle user registration */
const Register = async (req, res) => {

    //validate input
    const {value, error} = await validation(req.body);
    if (error) {
        return res.status(400).json(ApiError({
            status: 400,
            type: 'validation',
            data: error.details
        }));
    }

    //encrypt password
    const hashedPassword = await bcrypt.hash(value.password, 10);

    //create phone number
    const countryCode = await Country.findOne({alpha3Code: value.country}).select('callingCodes -_id');
    const phoneNo = `+${countryCode.callingCodes}-${value.phone}`;

    //create user object
    const user = {
        email: value.email,
        password: hashedPassword,
        firstName: value.firstName,
        lastName: value.lastName,
        address: value.address,
        country: value.country,
        phone: phoneNo
    };

    try {
        //saving to the database
        const createdUser = await User.create(user);
        res.json({
            status: 200,
            type: "success",
            message: "Registration Successful",
            data: {
                _id: createdUser._id,
            }
        });

    } catch (e) {
        // error code 11000 - duplicate entry
        if (e.code === 11000) {
            if (e.keyPattern.email) {
                res.status(400).json(ApiError({
                    status: 400,
                    type: 'DuplicateEntry',
                    message: "email address is already registered"
                }))
            }
            if (e.keyPattern.phone) {
                res.status(400).json(ApiError({
                    status: 400,
                    type: 'DuplicateEntry',
                    message: "phone number is already associated with an account"
                }))
            }
        } else {
            console.log(e);
            res.status(500).json(ApiError({
                status: 500,
                type: 'ServerError',
                message: "Internal Server Error"
            }))
        }
    }
};

module.exports = {
    register: Register
};
