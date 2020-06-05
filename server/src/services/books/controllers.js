const path = require('path'),
    mongoose = require('mongoose'),
    Book = require(path.join(__dirname, '..', '..', 'models', 'Books')),
    handleResponse = require(path.join(__dirname, '..', '..', 'helpers', 'handleResponse'));

async function getBooks(req, res) {
    try {
        const page = req.query.page,
            offset = page ? parseInt(page - 1) * process.env.BOOKS_PER_PAGE : 0,
            options = {
                offset,
                limit: process.env.BOOKS_PER_PAGE,
                select: 'title genre_id format_id borrowed picture',
                populate: {
                    path: 'genre_id format_id', 
                    select: '_id name'
                }
            }

        const book = await Book.paginate({}, options)
        console.log(book)
        return handleResponse.response(res, 200, book.docs)
    } catch (error) {
        console.log(error)
        return handleResponse.response(res, 500, null)
    }
}

async function getBook(req, res) {
    try {
        const _id = mongoose.Types.ObjectId(req.params._id)
        const book = await Book.aggregate([
            {$match: {_id}},
            {$lookup: {
                from: 'authors',
                localField: 'author_id',
                foreignField: '_id',
                as: 'author_id'
            }},
            {$lookup: {
                from: 'formats',
                localField: 'format_id',
                foreignField: '_id',
                as: 'format_id'
            }},
            {$lookup: {
                from: 'genres',
                localField: 'genre_id',
                foreignField: '_id',
                as: 'genre_id'
            }},
            {$lookup: {
                from: 'languages',
                localField: 'language_id',
                foreignField: '_id',
                as: 'language_id'
            }},
            {$lookup: {
                from: 'users',
                localField: 'user_id',
                foreignField: '_id',
                as: 'user_id'
            }},
            {$unwind: '$author_id'},
            {$unwind: '$genre_id'},
            {$unwind: '$language_id'},
            {$unwind: '$user_id'},
            {$addFields: {
                rank: {$avg: '$rank.qualification'},
            }},
            {$project: {
                '_id': 1,
                'title': 1,
                'isbn': 1,
                'number_pages': 1,
                'summary': 1,
                'borrowed': 1,
                'author_id._id': 1,
                'author_id.name': 1,
                'format_id._id': 1,
                'format_id.name': 1,
                'genre_id._id': 1,
                'genre_id.name': 1,
                'language_id._id': 1,
                'language_id.name': 1,
                'user_id._id': 1,
                'user_id.username': 1,
                'rank': {$trunc: ['$rank', 0]}
            }}
        ])
        return handleResponse.response(res, 200, book[0])
    } catch (error) {
        console.log(error)
        return handleResponse.response(res, 500, null)
    }
}

async function saveBook(req, res) {
    try {
        await Book.create(res.locals.data)
        return handleResponse.response(res, 200, null, 'El libro se ha guardado correctamente.')
    } catch (error) {
        console.log(error)
        return handleResponse.response(res, 500, null)
    }
}

async function updateRankBook(req, res) {
    try {
        const {_id, user_id, qualification} = res.locals.data
        await Book.bulkWrite([
            {
                updateOne: {
                    filter: {_id, 'rank.user_id': user_id},
                    update: {$set: {'rank.$.qualification': qualification}}
                }
            },
            {
                updateOne: {
                    filter: {_id, 'rank.user_id': {$ne: user_id}},
                    update: {$push: {'rank': {user_id, qualification}}}
                }
            }
        ])

        return handleResponse.response(res, 200, null, 'La calificación se ha actualizado exitosamente.')
    } catch (error) {
        console.log(error)
        return handleResponse.response(res, 500, null)
    }
}

module.exports = {
    getBooks,
    getBook,
    saveBook,
    updateRankBook
}