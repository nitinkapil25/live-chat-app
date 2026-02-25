export function formatMessageTime(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();

    const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

    const isSameYear = date.getFullYear() === now.getFullYear();

    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const minutesStr = minutes < 10 ? '0' + minutes : minutes.toString();
    const timeString = `${hours}:${minutesStr} ${ampm}`;

    if (isToday) {
        return timeString;
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthString = months[date.getMonth()];
    const day = date.getDate();

    if (isSameYear) {
        return `${monthString} ${day}, ${timeString}`;
    }

    const year = date.getFullYear();
    return `${monthString} ${day} ${year}, ${timeString}`;
}
