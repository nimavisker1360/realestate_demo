import {useAuth0} from "@auth0/auth0-react"
import { toast } from "react-toastify"
import { bilingualKey } from "../utils/bilingualToast"

const useAuthCheck = () => {

    const { isAuthenticated } = useAuth0()
    const validateLogin = () => {
        if(!isAuthenticated){
            toast.error(bilingualKey("toast.loginFirst"), {position: "bottom-right"})
            return false
        } else return true
    }
  return (
    {validateLogin}
  )
}

export default useAuthCheck
