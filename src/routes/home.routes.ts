import { Router } from 'express'
import { BASE_URL } from '../constants'
import { CourseWithProgress, NEGATIVE_STATUSES } from '../domain/model/course'
import { getCoursesByCategory } from '../domain/services/get-courses-by-category'
import { getUserEnrolments } from '../domain/services/get-user-enrolments'
import { getUser } from '../middleware/auth.middleware'
import { read } from '../modules/neo4j'

const router = Router()

/**
 * Display homepage
 */
router.get('/',  async (req, res, next) => {
    try {
        const user = await getUser(req)

        // Get Courses
        const categories = await getCoursesByCategory(user)

        // Get current courses
        let current: CourseWithProgress[] = []

        if ( user ) {
            try {
                const output = await getUserEnrolments(user.sub)
                current = output.enrolments.enrolled || []

                current.sort((a, b) => a.lastSeenAt > b.lastSeenAt ? -1 : 1)
            }
            catch(e) {
                current = []
            }
        }

        const beginners = categories.find(category => category.slug === 'experience')
            ?.children?.find(child => child.slug === 'beginners')

        const paths = categories.find(category => category.slug === 'paths')

        paths?.children?.sort((a, b) => a.title < b.title ? -1 : 1)

        const certification = categories.find(category => category.slug === 'certification')

        const activePath = 'developer'

        res.render('home', {
            title: 'Free, Self-Paced, Hands-on Online Training ',
            hero: {
                title: 'Free, Self-Paced, Hands-on Online Training',
                byline: 'Learn how to build, optimize and launch your Neo4j project, all from the Neo4j experts.',
                overline: 'Learn with GraphAcademy'
            },
            description: 'Learn how to build, optimize and launch your Neo4j project, all from the Neo4j experts.',
            classes: 'home transparent-nav preload',
            current,
            categories,
            beginners,
            paths,
            certification,
            activePath,
        })
    }
    catch (e) {
        next(e)
    }
})


/**
 * Generate sitemap
 */
router.get('/sitemap.txt', async (req, res, next) => {
    try {
        const result = await read(`
            MATCH (c:Course)
            WHERE NOT c.status IN $negative + ['redirect']
            RETURN '/courses/'+ c.slug AS link
            UNION ALL MATCH (c:Category) RETURN '/categories/'+ c.slug AS link
        `, { negative: NEGATIVE_STATUSES })

        const links = result.records
            .filter(row => row.get('link') !== null)
            .map(row => BASE_URL + row.get('link'))
            .join('\n')

        res.send(links)
    }
    catch(e) {
        next(e)
    }
})


export default router